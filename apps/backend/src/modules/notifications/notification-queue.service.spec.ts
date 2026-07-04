import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { NotificationStatus } from '../../../generated/prisma/index.js';
import { NotificationDispatcherService } from './notification-dispatcher.service.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationQueueService } from './notification-queue.service.js';
import { MAX_DELIVERY_ATTEMPTS } from './utils/retry-backoff.util.js';

describe('NotificationQueueService', () => {
  let service: NotificationQueueService;
  let prisma: {
    notificationQueue: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    notification: { update: jest.Mock };
    $transaction: jest.Mock;
  };
  let dispatcher: { dispatch: jest.Mock };
  let preferences: { getOrCreate: jest.Mock };

  const notificationId = 'notif-1';

  beforeEach(async () => {
    prisma = {
      notificationQueue: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      notification: { update: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    dispatcher = { dispatch: jest.fn() };
    preferences = {
      getOrCreate: jest.fn().mockResolvedValue({ timezone: 'UTC' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueueService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationDispatcherService, useValue: dispatcher },
        { provide: NotificationPreferencesService, useValue: preferences },
      ],
    }).compile();

    service = module.get(NotificationQueueService);
  });

  describe('enqueue', () => {
    it('creates a PENDING queue row and marks the notification QUEUED', async () => {
      const nextAttempt = new Date('2026-07-15T09:00:00.000Z');

      await service.enqueue(notificationId, nextAttempt);

      expect(prisma.notificationQueue.create).toHaveBeenCalledWith({
        data: { notificationId, status: 'PENDING', nextAttempt },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { status: NotificationStatus.QUEUED },
      });
    });
  });

  describe('processDue — retries', () => {
    const queueRow = {
      id: 'queue-1',
      notificationId,
      attempts: 0,
      status: 'PENDING',
      notification: { userId: 'user-1' },
    };

    it('marks both the queue row and the notification SENT on a successful dispatch', async () => {
      prisma.notificationQueue.findMany.mockResolvedValue([queueRow]);
      dispatcher.dispatch.mockResolvedValue({ success: true, results: [] });

      const summary = await service.processDue();

      expect(summary).toEqual({ processed: 1, sent: 1, failed: 0 });
      expect(prisma.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-1' },
        data: { status: 'SENT' },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          deliveredAt: expect.any(Date) as Date,
        },
      });
    });

    it('increments attempts and reschedules with backoff on a failed dispatch below the max', async () => {
      prisma.notificationQueue.findMany.mockResolvedValue([queueRow]);
      dispatcher.dispatch.mockResolvedValue({
        success: false,
        results: [{ channel: 'IN_APP', success: false, error: 'boom' }],
      });

      const summary = await service.processDue();

      expect(summary).toEqual({ processed: 1, sent: 0, failed: 1 });
      expect(prisma.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-1' },
        data: {
          attempts: 1,
          lastError: 'boom',
          status: 'PENDING',
          nextAttempt: expect.any(Date) as Date,
        },
      });
      // Not exhausted yet — the Notification itself stays whatever it was, not marked FAILED.
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('marks both rows terminally FAILED once attempts reach the max', async () => {
      prisma.notificationQueue.findMany.mockResolvedValue([
        { ...queueRow, attempts: MAX_DELIVERY_ATTEMPTS - 1 },
      ]);
      dispatcher.dispatch.mockResolvedValue({
        success: false,
        results: [
          { channel: 'IN_APP', success: false, error: 'still failing' },
        ],
      });

      await service.processDue();

      expect(prisma.notificationQueue.update).toHaveBeenCalledWith({
        where: { id: 'queue-1' },
        data: {
          attempts: MAX_DELIVERY_ATTEMPTS,
          lastError: 'still failing',
          status: 'FAILED',
          nextAttempt: null,
        },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { status: NotificationStatus.FAILED },
      });
    });

    it('processes nothing when no rows are due', async () => {
      prisma.notificationQueue.findMany.mockResolvedValue([]);

      const summary = await service.processDue();

      expect(summary).toEqual({ processed: 0, sent: 0, failed: 0 });
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    });
  });
});
