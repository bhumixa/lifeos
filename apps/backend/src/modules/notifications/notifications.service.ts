import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Prisma,
  type Notification,
} from '../../../generated/prisma/index.js';
import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import type { NotificationResponseDto } from './dto/notification-response.dto.js';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  scheduledFor: Date;
  payload?: Record<string, unknown>;
}

/**
 * Ownership follows the same pattern as every other module: every lookup is scoped by `userId`,
 * and a notification that exists but belongs to someone else is a 404, not a 403.
 *
 * `create` is the one write path — and it is only ever called by NotificationSchedulerService
 * reacting to a domain event, never by NotificationsController directly, per this milestone's own
 * "do not deliver notifications immediately inside controllers" business rule. There is no public
 * `POST /notifications` endpoint at all (see NotificationsController) — a client can read, mark
 * read/dismissed, and delete its own notifications, but never author one.
 *
 * Hard delete (`remove`) — a notification is disposable, re-derivable content (see the class doc
 * on Notification in prisma/schema.prisma), not the irreplaceable content the soft-delete
 * principle protects.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: ListNotificationsQueryDto,
  ): Promise<PaginatedResult<NotificationResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.priority && { priority: query.priority }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map((notification) => this.toResponse(notification)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** "Unread" means never marked READ and not DISMISSED — a dismissed notification is
   * intentionally hidden from both the unread list and the unread count, the same way dismissing a
   * banner elsewhere in the app means "stop showing me this," not "I read it." */
  async findUnread(userId: string): Promise<NotificationResponseDto[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        readAt: null,
        status: { not: NotificationStatus.DISMISSED },
      },
      orderBy: { scheduledFor: 'desc' },
    });
    return notifications.map((notification) => this.toResponse(notification));
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
        status: { not: NotificationStatus.DISMISSED },
      },
    });
  }

  async markRead(userId: string, id: string): Promise<NotificationResponseDto> {
    await this.findOrThrow(userId, id);
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
    return this.toResponse(notification);
  }

  async markAllRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        status: { not: NotificationStatus.DISMISSED },
      },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  async dismiss(userId: string, id: string): Promise<NotificationResponseDto> {
    await this.findOrThrow(userId, id);
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.DISMISSED },
    });
    return this.toResponse(notification);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOrThrow(userId, id);
    await this.prisma.notification.delete({ where: { id } });
  }

  /** Only ever called by NotificationSchedulerService — see the class doc above. */
  async create(input: CreateNotificationInput): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        priority: input.priority,
        scheduledFor: input.scheduledFor,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async findOrThrow(userId: string, id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  private toResponse(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      status: notification.status,
      scheduledFor: notification.scheduledFor,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      payload: notification.payload as Record<string, unknown> | null,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
