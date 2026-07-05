import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { GoalStatus, InsightType } from '../../../generated/prisma/index.js';
import { GoalsService } from '../goals/goals.service.js';
import { HabitsService } from '../habits/habits.service.js';
import { JournalService } from '../journal/journal.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PlannerService } from '../planner/planner.service.js';
import { StreaksService } from '../streaks/streaks.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { AiAnalysisService } from './ai-analysis.service.js';

describe('AiAnalysisService', () => {
  let service: AiAnalysisService;
  let prisma: {
    task: { findMany: jest.Mock };
    plannerBlock: { findMany: jest.Mock };
    habitLog: { findMany: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let streaksService: {
    getOverview: jest.Mock;
    getToday: jest.Mock;
    getStatistics: jest.Mock;
  };
  let goalsService: { findAll: jest.Mock; getProgress: jest.Mock };
  let habitsService: { summary: jest.Mock };
  let journalService: { history: jest.Mock };
  let notificationsService: { findUnread: jest.Mock };

  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      plannerBlock: { findMany: jest.fn().mockResolvedValue([]) },
      habitLog: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          timezone: 'UTC',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      },
    };

    streaksService = {
      getOverview: jest.fn().mockResolvedValue({
        hasDailyHabits: true,
        currentStreak: 3,
        longestStreak: 5,
        habits: [],
      }),
      getToday: jest.fn().mockResolvedValue({
        isTodaySuccessful: true,
        freezesRemainingThisMonth: 2,
      }),
      // Deliberately present so a test can assert it's never called — see below.
      getStatistics: jest.fn().mockResolvedValue({ shouldNeverBeCalled: true }),
    };

    goalsService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getProgress: jest.fn().mockResolvedValue({ shouldNeverBeCalled: true }),
    };

    habitsService = {
      summary: jest.fn().mockResolvedValue({
        habitsCompletedToday: 1,
        totalActiveHabits: 2,
        completionPercentage: 50,
      }),
    };

    journalService = {
      history: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };
    notificationsService = { findUnread: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAnalysisService,
        { provide: PrismaService, useValue: prisma },
        { provide: TasksService, useValue: {} },
        { provide: HabitsService, useValue: habitsService },
        { provide: PlannerService, useValue: {} },
        { provide: StreaksService, useValue: streaksService },
        { provide: GoalsService, useValue: goalsService },
        { provide: JournalService, useValue: journalService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(AiAnalysisService);
  });

  describe('never modifies data (business rule)', () => {
    it('computing STREAKS never calls StreaksService.getStatistics (it has a persisting side effect)', async () => {
      await service.computeSourceData(userId, InsightType.STREAKS);
      expect(streaksService.getStatistics).not.toHaveBeenCalled();
      expect(streaksService.getOverview).toHaveBeenCalledWith(userId);
      expect(streaksService.getToday).toHaveBeenCalledWith(userId);
    });

    it('computing GOALS never calls GoalsService.getProgress (it persists a refreshed currentValue)', async () => {
      await service.computeSourceData(userId, InsightType.GOALS);
      expect(goalsService.getProgress).not.toHaveBeenCalled();
      expect(goalsService.findAll).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ status: GoalStatus.ACTIVE }),
      );
    });
  });

  describe('cross-user scoping', () => {
    it('scopes every raw Prisma read to the requesting user', async () => {
      await service.computeSourceData(userId, InsightType.PRODUCTIVITY);

      const taskCalls = prisma.task.findMany.mock.calls as [
        { where: { userId: string } },
      ][];
      for (const [args] of taskCalls) {
        expect(args.where.userId).toBe(userId);
      }

      const plannerBlockCalls = prisma.plannerBlock.findMany.mock.calls as [
        { where: { plannerDay: { userId: string } } },
      ][];
      for (const [args] of plannerBlockCalls) {
        expect(args.where.plannerDay.userId).toBe(userId);
      }
    });
  });

  describe('computeSourceData', () => {
    it("returns HABITS metrics with today's summary and a time-of-day split", async () => {
      const data = await service.computeSourceData(userId, InsightType.HABITS);
      expect(data.totalActiveHabits).toBe(2);
      expect(data.habitsCompletedToday).toBe(1);
      expect(data).toHaveProperty('morningCompletions');
      expect(data).toHaveProperty('eveningCompletions');
    });

    it('returns GOALS metrics with an empty at-risk list when there are no active goals', async () => {
      const data = await service.computeSourceData(userId, InsightType.GOALS);
      expect(data.activeGoalCount).toBe(0);
      expect(data.atRiskGoals).toEqual([]);
    });

    it('flags a goal behind schedule as at-risk', async () => {
      goalsService.findAll.mockResolvedValue({
        data: [
          {
            id: 'goal-1',
            title: 'Ship the launch',
            progressPercent: 5,
            startDate: '2026-01-01',
            targetDate: '2026-02-01',
          },
        ],
        meta: {},
      });

      const data = (await service.computeSourceData(
        userId,
        InsightType.GOALS,
      )) as {
        atRiskGoals: unknown[];
        flags: string[];
      };
      expect(data.atRiskGoals).toHaveLength(1);
      expect(data.flags).toContain('risk');
    });

    it('returns JOURNAL metrics as STABLE with zero entries when there is no mood history', async () => {
      const data = await service.computeSourceData(userId, InsightType.JOURNAL);
      expect(data.direction).toBe('STABLE');
      expect(data.entriesAnalyzed).toBe(0);
    });

    it('returns a SYSTEM insight without querying any domain service', async () => {
      const data = await service.computeSourceData(userId, InsightType.SYSTEM);
      expect(data.reason).toBeDefined();
      expect(habitsService.summary).not.toHaveBeenCalled();
      expect(goalsService.findAll).not.toHaveBeenCalled();
    });
  });
});
