import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  type Notification,
} from '../../../generated/prisma/index.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  const mockNotification: Notification = {
    id: 'notif-1',
    userId,
    title: 'Task completed',
    message: 'You completed "Write report".',
    type: NotificationType.TASK,
    priority: NotificationPriority.LOW,
    status: NotificationStatus.SENT,
    scheduledFor: new Date('2026-07-15T10:00:00.000Z'),
    deliveredAt: new Date('2026-07-15T10:00:00.000Z'),
    readAt: null,
    payload: { taskId: 'task-1' },
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    updatedAt: new Date('2026-07-15T10:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  describe('findAll', () => {
    it('scopes the query to the requesting user and applies filters', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {
        status: NotificationStatus.SENT,
        page: 1,
        pageSize: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, status: NotificationStatus.SENT },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findUnread / unreadCount', () => {
    it('queries for readAt null and status not DISMISSED', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      await service.findUnread(userId);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          readAt: null,
          status: { not: NotificationStatus.DISMISSED },
        },
        orderBy: { scheduledFor: 'desc' },
      });
    });

    it('unreadCount uses the same where clause as findUnread', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const count = await service.unreadCount(userId);

      expect(count).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId,
          readAt: null,
          status: { not: NotificationStatus.DISMISSED },
        },
      });
    });
  });

  describe('markRead', () => {
    it('sets status READ and stamps readAt', async () => {
      prisma.notification.findFirst.mockResolvedValue(mockNotification);
      prisma.notification.update.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.READ,
        readAt: new Date(),
      });

      await service.markRead(userId, mockNotification.id);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: {
          status: NotificationStatus.READ,
          readAt: expect.any(Date) as Date,
        },
      });
    });

    it('throws 404 for another user’s notification — cross-user isolation', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.markRead(otherUserId, mockNotification.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllRead', () => {
    it('bulk-updates every unread, non-dismissed notification for this user only', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 4 });

      const result = await service.markAllRead(userId);

      expect(result).toEqual({ updatedCount: 4 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          readAt: null,
          status: { not: NotificationStatus.DISMISSED },
        },
        data: {
          status: NotificationStatus.READ,
          readAt: expect.any(Date) as Date,
        },
      });
    });
  });

  describe('dismiss', () => {
    it('sets status DISMISSED without touching readAt', async () => {
      prisma.notification.findFirst.mockResolvedValue(mockNotification);
      prisma.notification.update.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.DISMISSED,
      });

      await service.dismiss(userId, mockNotification.id);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
        data: { status: NotificationStatus.DISMISSED },
      });
    });

    it('throws 404 for another user’s notification — cross-user isolation', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.dismiss(otherUserId, mockNotification.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('hard-deletes the notification', async () => {
      prisma.notification.findFirst.mockResolvedValue(mockNotification);

      await service.remove(userId, mockNotification.id);

      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: mockNotification.id },
      });
    });

    it('throws 404 rather than deleting another user’s notification', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(otherUserId, mockNotification.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.notification.delete).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('persists every field, including an optional payload', async () => {
      prisma.notification.create.mockResolvedValue(mockNotification);

      await service.create({
        userId,
        title: 'Task completed',
        message: 'You completed "Write report".',
        type: NotificationType.TASK,
        priority: NotificationPriority.LOW,
        scheduledFor: mockNotification.scheduledFor,
        payload: { taskId: 'task-1' },
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          title: 'Task completed',
          message: 'You completed "Write report".',
          type: NotificationType.TASK,
          priority: NotificationPriority.LOW,
          scheduledFor: mockNotification.scheduledFor,
          payload: { taskId: 'task-1' },
        },
      });
    });
  });
});
