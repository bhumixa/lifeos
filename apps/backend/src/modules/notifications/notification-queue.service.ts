import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { NotificationStatus } from '../../../generated/prisma/index.js';
import { NotificationDispatcherService } from './notification-dispatcher.service.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import {
  computeBackoffMinutes,
  MAX_DELIVERY_ATTEMPTS,
} from './utils/retry-backoff.util.js';

/** In-memory queue-processing status strings, distinct from Notification's own status enum —
 * matches CalendarSyncService's own plain-string ("PENDING"/"SUCCESS"/"FAILED") convention for
 * NotificationQueue.status (see the class doc on NotificationQueue in prisma/schema.prisma). */
const QUEUE_PENDING = 'PENDING';
const QUEUE_SENT = 'SENT';
const QUEUE_FAILED = 'FAILED';

/**
 * Owns NotificationQueue rows — the retry-attempt ledger for each Notification. `enqueue` is
 * called once per Notification, right after NotificationsService creates it (see
 * NotificationSchedulerService). `processDue` is the seam a future BullMQ worker process
 * (`main.worker.ts`, anticipated since docs/05-architecture.md but still unbuilt) would call on an
 * interval — it's fully implemented and unit-tested here, but nothing in this milestone invokes it
 * automatically, the same "documented, tested, not automatically scheduled" shape Calendar's own
 * recurrence.util.ts already established for "recurring event preparation."
 */
@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly preferences: NotificationPreferencesService,
  ) {}

  async enqueue(notificationId: string, nextAttempt: Date): Promise<void> {
    await this.prisma.notificationQueue.create({
      data: { notificationId, status: QUEUE_PENDING, nextAttempt },
    });
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.QUEUED },
    });
  }

  /**
   * Drains up to `limit` due queue rows (status PENDING, `nextAttempt` <= now), dispatching each
   * via NotificationDispatcherService. A successful dispatch marks both the queue row and its
   * Notification SENT/delivered; a failed one increments `attempts`, records `lastError`, and
   * reschedules `nextAttempt` with exponential backoff — or, once `attempts` reaches
   * MAX_DELIVERY_ATTEMPTS, marks both rows terminally FAILED instead of rescheduling again.
   */
  async processDue(
    limit = 20,
  ): Promise<{ processed: number; sent: number; failed: number }> {
    const due = await this.prisma.notificationQueue.findMany({
      where: { status: QUEUE_PENDING, nextAttempt: { lte: new Date() } },
      include: { notification: true },
      orderBy: { nextAttempt: 'asc' },
      take: limit,
    });

    let sent = 0;
    let failed = 0;

    for (const row of due) {
      const preference = await this.preferences.getOrCreate(
        row.notification.userId,
      );
      const { success, results } = await this.dispatcher.dispatch(
        row.notification,
        preference,
      );

      if (success) {
        await this.prisma.$transaction([
          this.prisma.notificationQueue.update({
            where: { id: row.id },
            data: { status: QUEUE_SENT },
          }),
          this.prisma.notification.update({
            where: { id: row.notificationId },
            data: { status: NotificationStatus.SENT, deliveredAt: new Date() },
          }),
        ]);
        sent += 1;
        continue;
      }

      const attempts = row.attempts + 1;
      const lastError =
        results.find((r) => !r.success)?.error ?? 'Delivery failed';
      const exhausted = attempts >= MAX_DELIVERY_ATTEMPTS;

      await this.prisma.$transaction([
        this.prisma.notificationQueue.update({
          where: { id: row.id },
          data: {
            attempts,
            lastError,
            status: exhausted ? QUEUE_FAILED : QUEUE_PENDING,
            nextAttempt: exhausted
              ? null
              : new Date(Date.now() + computeBackoffMinutes(attempts) * 60_000),
          },
        }),
        ...(exhausted
          ? [
              this.prisma.notification.update({
                where: { id: row.notificationId },
                data: { status: NotificationStatus.FAILED },
              }),
            ]
          : []),
      ]);
      failed += 1;
      if (exhausted) {
        this.logger.warn(
          `Notification ${row.notificationId} failed after ${attempts} attempts: ${lastError}`,
        );
      }
    }

    return { processed: due.length, sent, failed };
  }
}
