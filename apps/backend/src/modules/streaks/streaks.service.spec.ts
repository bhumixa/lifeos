import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { HabitFrequency, type Habit } from '../../../generated/prisma/index.js';
import { TasksService } from '../tasks/tasks.service.js';
import { PlannerService } from '../planner/planner.service.js';
import { FreezeDaysService } from './freeze-days.service.js';
import { AchievementsService } from './achievements.service.js';
import { StreaksService } from './streaks.service.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('StreaksService', () => {
  let service: StreaksService;
  let prisma: {
    user: { findUnique: jest.Mock };
    habit: { findMany: jest.Mock; findFirst: jest.Mock };
    habitLog: { findMany: jest.Mock; count: jest.Mock };
  };
  let tasksService: { countCompleted: jest.Mock };
  let plannerService: { countCompletedBlocks: jest.Mock };
  let freezeDaysService: {
    getFrozenDates: jest.Mock;
    getStatus: jest.Mock;
  };
  let achievementsService: { evaluateAndUnlock: jest.Mock };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  function makeDailyHabit(overrides: Partial<Habit> = {}): Habit {
    return {
      id: 'habit-daily',
      userId,
      name: 'Drink water',
      description: null,
      icon: 'local_drink',
      color: '#03A9F4',
      targetFrequency: HabitFrequency.DAILY,
      targetCount: 1,
      category: null,
      reminderTime: null,
      isActive: true,
      goalId: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      deletedAt: null,
      ...overrides,
    };
  }

  function log(habitId: string, date: string, completedCount = 1) {
    return {
      id: `log-${habitId}-${date}`,
      habitId,
      date: new Date(`${date}T00:00:00.000Z`),
      completedCount,
      notes: null,
      createdAt: new Date(`${date}T09:00:00.000Z`),
    };
  }

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T12:00:00.000Z'));

    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ timezone: 'UTC' }) },
      habit: { findMany: jest.fn(), findFirst: jest.fn() },
      habitLog: { findMany: jest.fn(), count: jest.fn() },
    };
    tasksService = { countCompleted: jest.fn().mockResolvedValue(0) };
    plannerService = { countCompletedBlocks: jest.fn().mockResolvedValue(0) };
    freezeDaysService = {
      getFrozenDates: jest.fn().mockResolvedValue(new Set()),
      getStatus: jest.fn().mockResolvedValue({
        date: '2026-07-03',
        usedThisMonth: 0,
        remainingThisMonth: 2,
        monthlyQuota: 2,
        isDateFrozen: false,
      }),
    };
    achievementsService = {
      evaluateAndUnlock: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreaksService,
        { provide: PrismaService, useValue: prisma },
        { provide: TasksService, useValue: tasksService },
        { provide: PlannerService, useValue: plannerService },
        { provide: FreezeDaysService, useValue: freezeDaysService },
        { provide: AchievementsService, useValue: achievementsService },
      ],
    }).compile();

    service = module.get(StreaksService);
  });

  afterEach(() => jest.useRealTimers());

  describe('getOverview', () => {
    it('reports hasDailyHabits: false and zeroed streaks when there are no active daily habits', async () => {
      prisma.habit.findMany.mockResolvedValue([]);

      const overview = await service.getOverview(userId);

      expect(overview).toEqual({
        hasDailyHabits: false,
        currentStreak: 0,
        longestStreak: 0,
        habits: [],
      });
    });

    it('computes the overall current/longest streak across all active daily habits', async () => {
      const habit = makeDailyHabit();
      prisma.habit.findMany.mockResolvedValue([habit]);
      prisma.habitLog.findMany.mockResolvedValue([
        log(habit.id, '2026-07-01'),
        log(habit.id, '2026-07-02'),
        log(habit.id, '2026-07-03'),
      ]);
      freezeDaysService.getFrozenDates.mockResolvedValue(new Set());

      const overview = await service.getOverview(userId);

      expect(overview.hasDailyHabits).toBe(true);
      expect(overview.currentStreak).toBe(3);
      expect(overview.longestStreak).toBe(3);
      expect(overview.habits).toHaveLength(1);
      expect(overview.habits[0]).toMatchObject({
        habitId: habit.id,
        currentStreak: 3,
        longestStreak: 3,
        currentPeriodMet: true,
      });
    });

    it('only queries the requesting user’s own habits', async () => {
      prisma.habit.findMany.mockResolvedValue([]);

      await service.getOverview(userId);

      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        matching({
          where: matching({ userId, isActive: true, deletedAt: null }),
        }),
      );
    });
  });

  describe('getToday', () => {
    it('reports remaining habits and marks today unsuccessful when one is incomplete', async () => {
      const done = makeDailyHabit({ id: 'habit-done' });
      const pending = makeDailyHabit({ id: 'habit-pending' });
      prisma.habit.findMany.mockResolvedValue([done, pending]);
      prisma.habitLog.findMany.mockResolvedValue([log(done.id, '2026-07-03')]);

      const today = await service.getToday(userId);

      expect(today.totalDailyHabits).toBe(2);
      expect(today.completedDailyHabits).toBe(1);
      expect(today.remainingHabitIds).toEqual(['habit-pending']);
      expect(today.isTodaySuccessful).toBe(false);
    });

    it('treats a frozen today as successful even with an incomplete habit', async () => {
      const pending = makeDailyHabit({ id: 'habit-pending' });
      prisma.habit.findMany.mockResolvedValue([pending]);
      prisma.habitLog.findMany.mockResolvedValue([]);
      freezeDaysService.getStatus.mockResolvedValue({
        date: '2026-07-03',
        usedThisMonth: 1,
        remainingThisMonth: 1,
        monthlyQuota: 2,
        isDateFrozen: true,
      });

      const today = await service.getToday(userId);

      expect(today.isTodaySuccessful).toBe(true);
      expect(today.isFrozenToday).toBe(true);
    });

    it('reports hasDailyHabits: false without querying logs when there are no daily habits', async () => {
      prisma.habit.findMany.mockResolvedValue([]);

      const today = await service.getToday(userId);

      expect(today.hasDailyHabits).toBe(false);
      expect(prisma.habitLog.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('computes XP from tasks, habit logs, routine blocks, and perfect days', async () => {
      const habit = makeDailyHabit();
      prisma.habit.findMany.mockResolvedValue([habit]);
      prisma.habitLog.findMany
        // First call: daily-history log fetch.
        .mockResolvedValueOnce([log(habit.id, '2026-07-03')])
        // Second call: all-time createdAt timestamps for morning/night classification.
        .mockResolvedValueOnce([log(habit.id, '2026-07-03')]);
      prisma.habitLog.count.mockResolvedValue(4); // totalHabitCompletions
      tasksService.countCompleted.mockResolvedValue(2);
      plannerService.countCompletedBlocks.mockResolvedValueOnce(1); // ROUTINE-typed
      plannerService.countCompletedBlocks.mockResolvedValueOnce(3); // any type (Planner Master)

      const stats = await service.getStatistics(userId);

      // Perfect day count = 1 (today, the only day in the tiny fabricated history, was successful).
      // xp = 2*10 (tasks) + 4*5 (habits) + 1*15 (routines) + 1*50 (perfect day) = 20+20+15+50 = 105
      expect(stats.xpEarned).toBe(105);
      expect(stats.totals).toEqual({
        tasksCompleted: 2,
        habitCompletions: 4,
        routineCompletions: 1,
        perfectDays: 1,
      });
    });

    it('passes a fully-computed context into AchievementsService.evaluateAndUnlock', async () => {
      const habit = makeDailyHabit();
      prisma.habit.findMany.mockResolvedValue([habit]);
      prisma.habitLog.findMany
        .mockResolvedValueOnce([log(habit.id, '2026-07-03')])
        .mockResolvedValueOnce([log(habit.id, '2026-07-03')]);
      prisma.habitLog.count.mockResolvedValue(1);
      tasksService.countCompleted.mockResolvedValue(0);
      plannerService.countCompletedBlocks.mockResolvedValue(0);

      await service.getStatistics(userId);

      expect(achievementsService.evaluateAndUnlock).toHaveBeenCalledWith(
        userId,
        matching({
          totalHabitCompletions: 1,
          longestStreak: 1,
        }),
      );
    });

    it('reports zeroed streak fields when the user has no active daily habits, without crashing', async () => {
      prisma.habit.findMany.mockResolvedValue([]);
      prisma.habitLog.count.mockResolvedValue(0);
      prisma.habitLog.findMany.mockResolvedValue([]);

      const stats = await service.getStatistics(userId);

      expect(stats.hasDailyHabits).toBe(false);
      expect(stats.currentStreak).toBe(0);
      expect(stats.isPerfectWeek).toBe(false);
      expect(stats.isPerfectMonth).toBe(false);
    });

    it('includes the freeze-day quota summary from FreezeDaysService', async () => {
      prisma.habit.findMany.mockResolvedValue([]);
      prisma.habitLog.count.mockResolvedValue(0);
      prisma.habitLog.findMany.mockResolvedValue([]);
      freezeDaysService.getStatus.mockResolvedValue({
        date: '2026-07-03',
        usedThisMonth: 2,
        remainingThisMonth: 0,
        monthlyQuota: 2,
        isDateFrozen: false,
      });

      const stats = await service.getStatistics(userId);

      expect(stats.freezeDays).toEqual({
        usedThisMonth: 2,
        remainingThisMonth: 0,
        monthlyQuota: 2,
      });
    });
  });

  describe('getHabitStreak', () => {
    it('throws NotFoundException for a habit that does not exist or belongs to another user', async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(
        service.getHabitStreak(userId, 'missing-habit'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is scoped to the requesting user — a cross-user habitId is indistinguishable from missing', async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await service
        .getHabitStreak(otherUserId, 'someone-elses-habit')
        .catch(() => undefined);

      expect(prisma.habit.findFirst).toHaveBeenCalledWith(
        matching({
          where: matching({ id: 'someone-elses-habit', userId: otherUserId }),
        }),
      );
    });

    it('computes a DAILY habit’s own day-level streak', async () => {
      const habit = makeDailyHabit();
      prisma.habit.findFirst.mockResolvedValue(habit);
      prisma.habitLog.findMany.mockResolvedValue([
        log(habit.id, '2026-07-01'),
        log(habit.id, '2026-07-02'),
        log(habit.id, '2026-07-03'),
      ]);

      const detail = await service.getHabitStreak(userId, habit.id);

      expect(detail.currentStreak).toBe(3);
      expect(detail.longestStreak).toBe(3);
      expect(detail.currentPeriodMet).toBe(true);
    });

    it('computes a WEEKLY habit’s own period-level streak from cumulative logs per week', async () => {
      const habit = makeDailyHabit({
        id: 'habit-weekly',
        targetFrequency: HabitFrequency.WEEKLY,
        targetCount: 3,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      });
      prisma.habit.findFirst.mockResolvedValue(habit);
      // Current week (Mon 2026-06-29..Fri 2026-07-03): 3 logs meets targetCount 3.
      prisma.habitLog.findMany.mockResolvedValue([
        log(habit.id, '2026-06-29'),
        log(habit.id, '2026-06-30'),
        log(habit.id, '2026-07-01'),
      ]);

      const detail = await service.getHabitStreak(userId, habit.id);

      expect(detail.currentPeriodMet).toBe(true);
      expect(detail.currentPeriodCount).toBe(3);
      expect(detail.currentStreak).toBeGreaterThanOrEqual(1);
    });
  });
});
