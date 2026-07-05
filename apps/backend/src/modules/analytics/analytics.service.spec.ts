import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  GoalStatus,
  InsightStatus,
  PlannerBlockType,
  TaskStatus,
} from '../../../generated/prisma/index.js';
import { AiInsightsService } from '../ai/ai-insights.service.js';
import { CalendarEventsService } from '../calendar/calendar-events.service.js';
import { GoalsService } from '../goals/goals.service.js';
import { HabitsService } from '../habits/habits.service.js';
import { JournalService } from '../journal/journal.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { StreaksService } from '../streaks/streaks.service.js';
import { AnalyticsService } from './analytics.service.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    task: { findMany: jest.Mock };
    plannerBlock: { findMany: jest.Mock };
    habitLog: { findMany: jest.Mock };
    habit: { count: jest.Mock };
    goal: { findMany: jest.Mock; count: jest.Mock };
    journalEntry: { findMany: jest.Mock };
    calendarEvent: { findMany: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let habitsService: { summary: jest.Mock };
  let goalsService: { findAll: jest.Mock };
  let streaksService: { getOverview: jest.Mock };
  let journalService: { history: jest.Mock };
  let notificationsService: { findUnread: jest.Mock };
  let calendarEventsService: { findAll: jest.Mock };
  let aiInsightsService: { findAll: jest.Mock };

  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      plannerBlock: { findMany: jest.fn().mockResolvedValue([]) },
      habitLog: { findMany: jest.fn().mockResolvedValue([]) },
      habit: { count: jest.fn().mockResolvedValue(0) },
      goal: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      journalEntry: { findMany: jest.fn().mockResolvedValue([]) },
      calendarEvent: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findUnique: jest.fn().mockResolvedValue({ timezone: 'UTC' }),
      },
    };

    habitsService = {
      summary: jest.fn().mockResolvedValue({
        habitsCompletedToday: 1,
        totalActiveHabits: 2,
        completionPercentage: 50,
      }),
    };
    goalsService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };
    streaksService = {
      getOverview: jest.fn().mockResolvedValue({ currentStreak: 4 }),
    };
    journalService = {
      history: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };
    notificationsService = { findUnread: jest.fn().mockResolvedValue([]) };
    calendarEventsService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
    };
    aiInsightsService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HabitsService, useValue: habitsService },
        { provide: GoalsService, useValue: goalsService },
        { provide: StreaksService, useValue: streaksService },
        { provide: JournalService, useValue: journalService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: CalendarEventsService, useValue: calendarEventsService },
        { provide: AiInsightsService, useValue: aiInsightsService },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  describe('computeTodayScores', () => {
    it('blends task/planner/habit completion into productivityScore and reuses each sibling service', async () => {
      prisma.task.findMany.mockImplementation(
        ({ where }: { where: { status?: string } }) =>
          Promise.resolve(
            where.status === TaskStatus.COMPLETED
              ? [{ completedAt: new Date() }]
              : [{ createdAt: new Date() }],
          ),
      );
      prisma.plannerBlock.findMany.mockResolvedValue([
        { completed: true, plannerDay: { date: new Date('2026-07-05') } },
      ]);

      const scores = await service.computeTodayScores(userId);

      expect(scores.habitScore).toBe(50);
      expect(scores.plannerScore).toBe(100);
      // (100 [task] + 100 [planner] + 50 [habit]) / 3 = 83.33 -> 83
      expect(scores.productivityScore).toBe(83);
      expect(scores.streakDays).toBe(4);
      expect(streaksService.getOverview).toHaveBeenCalledWith(userId);
      expect(habitsService.summary).toHaveBeenCalledWith(userId);
    });

    it('never calls a sibling method that would persist a side effect', async () => {
      await service.computeTodayScores(userId);
      // GoalsService.getProgress / StreaksService.getStatistics both write — AnalyticsService
      // must only ever call findAll/getOverview, the read-only methods actually mocked above.
      expect(goalsService.findAll).toHaveBeenCalledWith(
        userId,
        matching({ status: GoalStatus.ACTIVE, archived: false }),
      );
    });
  });

  describe('getOverviewEnrichment', () => {
    it('folds active insight count and unread notification count in without writing anything', async () => {
      aiInsightsService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 3 },
      });
      notificationsService.findUnread.mockResolvedValue([
        { id: '1' },
        { id: '2' },
      ]);

      const result = await service.getOverviewEnrichment(userId);

      expect(result).toEqual({
        activeInsightCount: 3,
        unreadNotificationCount: 2,
      });
      expect(aiInsightsService.findAll).toHaveBeenCalledWith(
        userId,
        matching({ status: InsightStatus.ACTIVE }),
      );
    });
  });

  describe('getProductivity', () => {
    it('computes deltaPercent as this-window rate minus the previous window rate', async () => {
      let call = 0;
      prisma.task.findMany.mockImplementation(() => {
        call++;
        // 1st call (this window, created), 2nd (this window, completed): full completion.
        // 3rd/4th (previous window): no data at all.
        if (call === 1)
          return Promise.resolve([
            { createdAt: new Date('2026-07-05T10:00:00Z') },
          ]);
        if (call === 2)
          return Promise.resolve([
            { completedAt: new Date('2026-07-05T10:00:00Z') },
          ]);
        return Promise.resolve([]);
      });

      const result = await service.getProductivity(userId, 'DAY');

      expect(result.summary.averageCompletionRate).toBe(100);
      expect(result.summary.deltaPercent).toBe(100);
      expect(result.period).toBe('DAY');
    });
  });

  describe('getHabits', () => {
    it('reports total active habits as the per-day denominator', async () => {
      prisma.habit.count.mockResolvedValue(2);
      prisma.habitLog.findMany.mockResolvedValue([
        { date: new Date('2026-07-05') },
        { date: new Date('2026-07-05') },
      ]);

      const result = await service.getHabits(userId, 'DAY');

      expect(result.summary.totalActiveHabits).toBe(2);
      expect(result.summary.totalLogs).toBe(2);
      expect(result.summary.averageCompletionRate).toBe(100);
    });
  });

  describe('getGoals', () => {
    it('averages progressPercent across active goals for the score, counts COMPLETED separately', async () => {
      goalsService.findAll.mockResolvedValue({
        data: [{ progressPercent: 20 }, { progressPercent: 80 }],
        meta: {},
      });
      prisma.goal.count.mockResolvedValue(1);

      const result = await service.getGoals(userId, 'WEEK');

      expect(result.summary.activeCount).toBe(2);
      expect(result.summary.completedCount).toBe(1);
      expect(result.summary.averageProgressPercent).toBe(50);
      expect(result.summary.completionRate).toBe(33); // 1 completed of 3 total
    });
  });

  describe('getPlanner', () => {
    it('utilization is completed minutes over scheduled minutes, focus minutes only from completed FOCUS blocks', async () => {
      prisma.plannerBlock.findMany.mockResolvedValue([
        {
          completed: true,
          duration: 30,
          type: PlannerBlockType.FOCUS,
          plannerDay: { date: new Date('2026-07-05') },
        },
        {
          completed: false,
          duration: 30,
          type: PlannerBlockType.TASK,
          plannerDay: { date: new Date('2026-07-05') },
        },
      ]);

      const result = await service.getPlanner(userId, 'DAY');

      expect(result.summary.totalFocusMinutes).toBe(30);
      expect(result.summary.totalBlocksCompleted).toBe(1);
      expect(result.summary.averageUtilizationRate).toBe(50);
    });
  });

  describe('getJournal', () => {
    it('averages mood score per bucket and reports entry count as total', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([
        { date: new Date('2026-07-05'), mood: 'GOOD' },
        { date: new Date('2026-07-05'), mood: 'EXCELLENT' },
      ]);

      const result = await service.getJournal(userId, 'DAY');

      expect(result.series[0].value).toBe(4.5); // (4 + 5) / 2
      expect(result.series[0].total).toBe(2);
      expect(result.summary.consistencyRate).toBe(100);
    });

    it('is scoped to the requesting user only', async () => {
      await service.getJournal(userId, 'WEEK');
      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching({ where: matching({ userId, deletedAt: null }) }),
      );
    });
  });

  describe('getCalendar', () => {
    it('counts events per bucket and reuses CalendarEventsService for the upcoming-events total', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([
        { startTime: new Date('2026-07-05T09:00:00Z') },
        { startTime: new Date('2026-07-05T14:00:00Z') },
      ]);
      calendarEventsService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 5 },
      });

      const result = await service.getCalendar(userId, 'DAY');

      expect(result.summary.totalEvents).toBe(2);
      expect(result.summary.upcomingEvents).toBe(5);
    });
  });
});
