import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { NotificationPreference } from '../../../generated/prisma/index.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let prisma: {
    notificationPreference: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };

  const userId = 'user-1';

  const mockPreference: NotificationPreference = {
    id: 'pref-1',
    userId,
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'UTC',
    enableTasks: true,
    enableHabits: true,
    enablePlanner: true,
    enableGoals: true,
    enableJournal: true,
    enableCalendar: true,
    enableStreaks: true,
    enableAchievements: true,
    enableEmail: false,
    enablePush: false,
    enableInApp: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      notificationPreference: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationPreferencesService);
  });

  describe('getOrCreate', () => {
    it('returns the existing row without touching User when one already exists', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );

      const result = await service.getOrCreate(userId);

      expect(result).toBe(mockPreference);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.notificationPreference.create).not.toHaveBeenCalled();
    });

    it('creates a default row seeded from the user’s own timezone when none exists', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        timezone: 'America/New_York',
      });
      prisma.notificationPreference.create.mockResolvedValue(mockPreference);

      await service.getOrCreate(userId);

      expect(prisma.notificationPreference.create).toHaveBeenCalledWith({
        data: { userId, timezone: 'America/New_York' },
      });
    });

    it('falls back to UTC when the user row has no timezone on record', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.notificationPreference.create.mockResolvedValue(mockPreference);

      await service.getOrCreate(userId);

      expect(prisma.notificationPreference.create).toHaveBeenCalledWith({
        data: { userId, timezone: 'UTC' },
      });
    });
  });

  describe('update', () => {
    it('auto-creates the row first, then patches only the provided fields', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );
      prisma.notificationPreference.update.mockResolvedValue({
        ...mockPreference,
        enableEmail: true,
      });

      await service.update(userId, { enableEmail: true });

      expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { userId },
        data: { enableEmail: true },
      });
    });

    it('allows explicitly clearing quiet hours back to null', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(
        mockPreference,
      );
      prisma.notificationPreference.update.mockResolvedValue(mockPreference);

      await service.update(userId, {
        quietHoursStart: null,
        quietHoursEnd: null,
      });

      expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { userId },
        data: { quietHoursStart: null, quietHoursEnd: null },
      });
    });
  });

  describe('isCategoryEnabled', () => {
    it.each([
      ['TASK', 'enableTasks'],
      ['HABIT', 'enableHabits'],
      ['PLANNER', 'enablePlanner'],
      ['GOAL', 'enableGoals'],
      ['JOURNAL', 'enableJournal'],
      ['CALENDAR', 'enableCalendar'],
      ['STREAK', 'enableStreaks'],
      ['ACHIEVEMENT', 'enableAchievements'],
    ] as const)('maps %s to preference.%s', (type, field) => {
      expect(
        service.isCategoryEnabled({ ...mockPreference, [field]: true }, type),
      ).toBe(true);
      expect(
        service.isCategoryEnabled({ ...mockPreference, [field]: false }, type),
      ).toBe(false);
    });

    it('always allows SYSTEM notifications, which have no dedicated toggle', () => {
      expect(service.isCategoryEnabled(mockPreference, 'SYSTEM')).toBe(true);
    });
  });
});
