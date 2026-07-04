import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  NotificationPriority,
  NotificationType,
} from '../../../generated/prisma/index.js';
import {
  AchievementUnlockedEvent,
  CalendarEventStartingEvent,
  GoalCompletedEvent,
  HabitCompletedEvent,
  JournalCreatedEvent,
  PlannerBlockCompletedEvent,
  TaskCompletedEvent,
} from '../../events/index.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationQueueService } from './notification-queue.service.js';
import { NotificationSchedulerService } from './notification-scheduler.service.js';
import { NotificationTemplateService } from './notification-template.service.js';
import type { CreateNotificationInput } from './notifications.service.js';
import { NotificationsService } from './notifications.service.js';

/** Extracts the single argument of a `notifications.create` call, typed concretely so indexing
 * into it doesn't trip @typescript-eslint/no-unsafe-member-access the way indexing
 * `jest.Mock.mock.calls` (typed `any[][]`) directly would — same pattern
 * achievements.service.spec.ts's `createManyData` helper uses. */
function createCallArg(mock: jest.Mock): CreateNotificationInput {
  return (mock.mock.calls as [CreateNotificationInput][])[0][0];
}

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let prisma: { calendarEvent: { findMany: jest.Mock } };
  let notifications: { create: jest.Mock };
  let preferences: { getOrCreate: jest.Mock; isCategoryEnabled: jest.Mock };
  let queue: { enqueue: jest.Mock };

  const userId = 'user-1';

  const enabledPreference = {
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'UTC',
  };

  beforeEach(async () => {
    prisma = { calendarEvent: { findMany: jest.fn() } };
    notifications = {
      create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };
    preferences = {
      getOrCreate: jest.fn().mockResolvedValue(enabledPreference),
      isCategoryEnabled: jest.fn().mockReturnValue(true),
    };
    queue = { enqueue: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: NotificationPreferencesService, useValue: preferences },
        {
          provide: NotificationTemplateService,
          useValue: new NotificationTemplateService(),
        },
        { provide: NotificationQueueService, useValue: queue },
      ],
    }).compile();

    service = module.get(NotificationSchedulerService);
  });

  describe('event subscribers', () => {
    it('creates and enqueues a TASK notification on TaskCompletedEvent', async () => {
      await service.handleTaskCompleted(
        new TaskCompletedEvent(userId, 'task-1', 'Write report'),
      );

      expect(preferences.isCategoryEnabled).toHaveBeenCalledWith(
        enabledPreference,
        NotificationType.TASK,
      );
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.TASK,
          payload: { taskId: 'task-1' },
        }),
      );
      expect(queue.enqueue).toHaveBeenCalledWith('notif-1', expect.any(Date));
    });

    it('creates a HABIT notification on HabitCompletedEvent', async () => {
      await service.handleHabitCompleted(
        new HabitCompletedEvent(userId, 'habit-1', 'Drink water', '2026-07-15'),
      );

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.HABIT,
          payload: { habitId: 'habit-1', date: '2026-07-15' },
        }),
      );
    });

    it('creates a PLANNER notification on PlannerBlockCompletedEvent', async () => {
      await service.handlePlannerBlockCompleted(
        new PlannerBlockCompletedEvent(userId, 'block-1', 'Deep work'),
      );

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.PLANNER }),
      );
    });

    it('creates a HIGH-priority GOAL notification on GoalCompletedEvent', async () => {
      await service.handleGoalCompleted(
        new GoalCompletedEvent(userId, 'goal-1', 'Run a marathon'),
      );

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.GOAL,
          priority: NotificationPriority.HIGH,
        }),
      );
    });

    it('creates a JOURNAL notification on JournalCreatedEvent', async () => {
      await service.handleJournalCreated(
        new JournalCreatedEvent(userId, 'journal-1', 'MORNING'),
      );

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.JOURNAL }),
      );
    });

    it('creates an ACHIEVEMENT notification on AchievementUnlockedEvent', async () => {
      await service.handleAchievementUnlocked(
        new AchievementUnlockedEvent(userId, 'ach-1', 'First Habit', 50),
      );

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ACHIEVEMENT,
          message: expect.stringContaining('50') as string,
        }),
      );
    });

    it('creates a CALENDAR notification on CalendarEventStartingEvent', async () => {
      await service.handleCalendarEventStarting(
        new CalendarEventStartingEvent(
          userId,
          'event-1',
          'Standup',
          new Date(),
        ),
      );

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CALENDAR }),
      );
    });
  });

  describe('preference gating', () => {
    it('skips creating a notification entirely when the category is disabled', async () => {
      preferences.isCategoryEnabled.mockReturnValue(false);

      await service.handleTaskCompleted(
        new TaskCompletedEvent(userId, 'task-1', 'Write report'),
      );

      expect(notifications.create).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('quiet hours', () => {
    it('schedules for later, not immediately, when the user is currently in a quiet-hours window', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-15T23:30:00.000Z'));
      preferences.getOrCreate.mockResolvedValue({
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'UTC',
      });

      await service.handleTaskCompleted(
        new TaskCompletedEvent(userId, 'task-1', 'Write report'),
      );

      const scheduledFor = createCallArg(notifications.create).scheduledFor;
      expect(scheduledFor.toISOString()).toBe('2026-07-16T07:00:00.000Z');

      jest.useRealTimers();
    });
  });

  describe('scanUpcomingCalendarEvents', () => {
    it('reads CalendarEvent directly and emits/handles one CalendarEventStartingEvent per row', async () => {
      const startTime = new Date('2026-07-15T10:10:00.000Z');
      prisma.calendarEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          title: 'Standup',
          startTime,
          calendar: { userId },
        },
      ]);

      const count = await service.scanUpcomingCalendarEvents(15);

      expect(count).toBe(1);
      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }) as object,
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CALENDAR,
          payload: { calendarEventId: 'event-1' },
        }),
      );
    });

    it('returns 0 and creates nothing when no calendar events are upcoming', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([]);

      const count = await service.scanUpcomingCalendarEvents();

      expect(count).toBe(0);
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });
});
