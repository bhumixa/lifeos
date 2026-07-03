import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  GoalPriority,
  GoalStatus,
  GoalTargetType,
  PlannerBlockType,
  type Goal,
  type GoalMilestone,
} from '../../../generated/prisma/index.js';
import { TasksService } from '../tasks/tasks.service.js';
import { HabitsService } from '../habits/habits.service.js';
import { RoutinesService } from '../routines/routines.service.js';
import { PlannerService } from '../planner/planner.service.js';
import { GoalsService } from './goals.service.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: {
    goal: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    goalMilestone: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let tasksService: { countCompletedByGoal: jest.Mock };
  let habitsService: { countLogsByGoal: jest.Mock };
  let routinesService: { getStepIdsByGoal: jest.Mock };
  let plannerService: {
    countCompletedBlocksByReferenceIds: jest.Mock;
    sumCompletedDurationByGoal: jest.Mock;
  };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  function makeGoal(overrides: Partial<Goal> = {}): Goal {
    return {
      id: 'goal-1',
      userId,
      title: 'Run a half marathon',
      description: null,
      icon: 'flag',
      color: '#3F51B5',
      category: null,
      priority: GoalPriority.MEDIUM,
      targetType: GoalTargetType.TASK_COUNT,
      targetValue: 10,
      currentValue: 0,
      startDate: null,
      targetDate: null,
      status: GoalStatus.NOT_STARTED,
      archived: false,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      deletedAt: null,
      ...overrides,
    };
  }

  function makeMilestone(
    overrides: Partial<GoalMilestone> = {},
  ): GoalMilestone {
    return {
      id: 'milestone-1',
      goalId: 'goal-1',
      title: 'Complete a 10k run',
      description: null,
      dueDate: null,
      completed: false,
      completedAt: null,
      order: 0,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      goal: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      goalMilestone: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    tasksService = { countCompletedByGoal: jest.fn() };
    habitsService = { countLogsByGoal: jest.fn() };
    routinesService = { getStepIdsByGoal: jest.fn() };
    plannerService = {
      countCompletedBlocksByReferenceIds: jest.fn(),
      sumCompletedDurationByGoal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TasksService, useValue: tasksService },
        { provide: HabitsService, useValue: habitsService },
        { provide: RoutinesService, useValue: routinesService },
        { provide: PlannerService, useValue: plannerService },
      ],
    }).compile();

    service = module.get(GoalsService);
  });

  describe('findAll', () => {
    it('scopes the query to the requesting user and excludes archived goals by default', async () => {
      prisma.goal.findMany.mockResolvedValue([
        { ...makeGoal(), milestones: [] },
      ]);
      prisma.goal.count.mockResolvedValue(1);

      await service.findAll(userId, {});

      expect(prisma.goal.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.goal.findMany>[0]>({
          where: matching({ userId, deletedAt: null, archived: false }),
        }),
      );
    });

    it('computes progressPercent from the stored currentValue/targetValue', async () => {
      prisma.goal.findMany.mockResolvedValue([
        { ...makeGoal({ currentValue: 5, targetValue: 10 }), milestones: [] },
      ]);
      prisma.goal.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {});

      expect(result.data[0].progressPercent).toBe(50);
      // findAll must never touch the reused services — currentValue is read as-stored, not
      // recomputed on every list call (see the class doc on GoalsService).
      expect(tasksService.countCompletedByGoal).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the goal does not exist or belongs to someone else', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(service.findOne(otherUserId, 'goal-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('includes milestone counts in the response', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal(),
        milestones: [
          makeMilestone({ id: 'm1', completed: true }),
          makeMilestone({ id: 'm2', completed: false }),
        ],
      });

      const result = await service.findOne(userId, 'goal-1');

      expect(result.milestonesCompletedCount).toBe(1);
      expect(result.milestonesTotalCount).toBe(2);
    });
  });

  describe('create', () => {
    it('defaults currentValue to 0 when omitted', async () => {
      prisma.goal.create.mockResolvedValue({ ...makeGoal(), milestones: [] });

      await service.create(userId, {
        title: 'Run a half marathon',
        icon: 'flag',
        color: '#3F51B5',
        targetType: GoalTargetType.TASK_COUNT,
        targetValue: 10,
      });

      expect(prisma.goal.create).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.goal.create>[0]>({
          data: matching({ userId, currentValue: 0 }),
        }),
      );
    });
  });

  describe('update', () => {
    it('verifies ownership before updating', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.update(otherUserId, 'goal-1', { title: 'New title' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.goal.update).not.toHaveBeenCalled();
    });

    it('ignores a client-supplied currentValue for an automatic (non-CUSTOM) goal', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({ targetType: GoalTargetType.TASK_COUNT, currentValue: 3 }),
        milestones: [],
      });
      prisma.goal.update.mockResolvedValue({
        ...makeGoal({ targetType: GoalTargetType.TASK_COUNT, currentValue: 3 }),
        milestones: [],
      });

      await service.update(userId, 'goal-1', { currentValue: 999 });

      const [call] = prisma.goal.update.mock.calls as [
        { data: Record<string, unknown> },
      ][];
      expect(call[0].data).not.toHaveProperty('currentValue');
    });

    it('applies a client-supplied currentValue for a CUSTOM goal', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({ targetType: GoalTargetType.CUSTOM, currentValue: 3 }),
        milestones: [],
      });
      prisma.goal.update.mockResolvedValue({
        ...makeGoal({ targetType: GoalTargetType.CUSTOM, currentValue: 7 }),
        milestones: [],
      });

      await service.update(userId, 'goal-1', { currentValue: 7 });

      expect(prisma.goal.update).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.goal.update>[0]>({
          data: matching({ currentValue: 7 }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes rather than hard-deleting', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal(),
        milestones: [],
      });
      prisma.goal.update.mockResolvedValue({ ...makeGoal(), milestones: [] });

      await service.remove(userId, 'goal-1');

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { deletedAt: matching({}) },
      });
    });
  });

  describe('archive / unarchive', () => {
    it('archive sets archived to true', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal(),
        milestones: [],
      });
      prisma.goal.update.mockResolvedValue({
        ...makeGoal({ archived: true }),
        milestones: [],
      });

      const result = await service.archive(userId, 'goal-1');

      expect(prisma.goal.update).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.goal.update>[0]>({
          data: { archived: true },
        }),
      );
      expect(result.archived).toBe(true);
    });

    it('unarchive sets archived to false', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({ archived: true }),
        milestones: [],
      });
      prisma.goal.update.mockResolvedValue({
        ...makeGoal({ archived: false }),
        milestones: [],
      });

      const result = await service.unarchive(userId, 'goal-1');

      expect(result.archived).toBe(false);
    });

    it('throws NotFoundException for someone else’s goal', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(service.archive(otherUserId, 'goal-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProgress', () => {
    it('TASK_COUNT: reuses TasksService.countCompletedByGoal', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({
          targetType: GoalTargetType.TASK_COUNT,
          currentValue: 2,
          targetValue: 10,
        }),
        milestones: [],
      });
      tasksService.countCompletedByGoal.mockResolvedValue(4);
      prisma.goal.update.mockResolvedValue({});

      const result = await service.getProgress(userId, 'goal-1');

      expect(tasksService.countCompletedByGoal).toHaveBeenCalledWith(
        userId,
        'goal-1',
      );
      expect(result.currentValue).toBe(4);
      expect(result.progressPercent).toBe(40);
      expect(result.remainingValue).toBe(6);
      expect(result.isComplete).toBe(false);
    });

    it('HABIT_COMPLETION: reuses HabitsService.countLogsByGoal', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({
          targetType: GoalTargetType.HABIT_COMPLETION,
          currentValue: 0,
          targetValue: 20,
        }),
        milestones: [],
      });
      habitsService.countLogsByGoal.mockResolvedValue(20);
      prisma.goal.update.mockResolvedValue({});

      const result = await service.getProgress(userId, 'goal-1');

      expect(habitsService.countLogsByGoal).toHaveBeenCalledWith(
        userId,
        'goal-1',
      );
      expect(result.currentValue).toBe(20);
      expect(result.isComplete).toBe(true);
    });

    it('ROUTINE_COMPLETION: asks Routines for step ids, then Planner for completed-block count', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({
          targetType: GoalTargetType.ROUTINE_COMPLETION,
          currentValue: 0,
          targetValue: 5,
        }),
        milestones: [],
      });
      routinesService.getStepIdsByGoal.mockResolvedValue(['step-1', 'step-2']);
      plannerService.countCompletedBlocksByReferenceIds.mockResolvedValue(3);
      prisma.goal.update.mockResolvedValue({});

      const result = await service.getProgress(userId, 'goal-1');

      expect(routinesService.getStepIdsByGoal).toHaveBeenCalledWith(
        userId,
        'goal-1',
      );
      expect(
        plannerService.countCompletedBlocksByReferenceIds,
      ).toHaveBeenCalledWith(
        userId,
        ['step-1', 'step-2'],
        PlannerBlockType.ROUTINE,
      );
      expect(result.currentValue).toBe(3);
    });

    it('FOCUS_TIME: reuses PlannerService.sumCompletedDurationByGoal', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({
          targetType: GoalTargetType.FOCUS_TIME,
          currentValue: 0,
          targetValue: 600,
        }),
        milestones: [],
      });
      plannerService.sumCompletedDurationByGoal.mockResolvedValue(120);
      prisma.goal.update.mockResolvedValue({});

      const result = await service.getProgress(userId, 'goal-1');

      expect(plannerService.sumCompletedDurationByGoal).toHaveBeenCalledWith(
        userId,
        'goal-1',
      );
      expect(result.currentValue).toBe(120);
    });

    it('CUSTOM: never calls any reused service, and never re-persists an unchanged value', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({
          targetType: GoalTargetType.CUSTOM,
          currentValue: 7,
          targetValue: 10,
        }),
        milestones: [],
      });

      const result = await service.getProgress(userId, 'goal-1');

      expect(tasksService.countCompletedByGoal).not.toHaveBeenCalled();
      expect(habitsService.countLogsByGoal).not.toHaveBeenCalled();
      expect(routinesService.getStepIdsByGoal).not.toHaveBeenCalled();
      expect(plannerService.sumCompletedDurationByGoal).not.toHaveBeenCalled();
      expect(prisma.goal.update).not.toHaveBeenCalled();
      expect(result.currentValue).toBe(7);
    });

    it('persists the refreshed currentValue only when it actually changed', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal({
          targetType: GoalTargetType.TASK_COUNT,
          currentValue: 4,
          targetValue: 10,
        }),
        milestones: [],
      });
      tasksService.countCompletedByGoal.mockResolvedValue(4);

      await service.getProgress(userId, 'goal-1');

      expect(prisma.goal.update).not.toHaveBeenCalled();
    });
  });

  describe('milestones', () => {
    it('addMilestone appends at the next order when omitted', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal(),
        milestones: [
          makeMilestone({ order: 0 }),
          makeMilestone({ id: 'm2', order: 1 }),
        ],
      });
      prisma.goalMilestone.findFirst.mockResolvedValue(
        makeMilestone({ order: 1 }),
      );
      prisma.goalMilestone.create.mockResolvedValue(
        makeMilestone({ id: 'm3', order: 2 }),
      );

      const result = await service.addMilestone(userId, 'goal-1', {
        title: 'New checkpoint',
      });

      expect(prisma.goalMilestone.create).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.goalMilestone.create>[0]>({
          data: matching({ goalId: 'goal-1', order: 2 }),
        }),
      );
      expect(result.order).toBe(2);
    });

    it('milestones in a goal response are returned in ascending order', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        ...makeGoal(),
        milestones: [
          makeMilestone({ id: 'm3', order: 2 }),
          makeMilestone({ id: 'm1', order: 0 }),
          makeMilestone({ id: 'm2', order: 1 }),
        ],
      });

      const result = await service.findOne(userId, 'goal-1');

      expect(result.milestones.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    });

    it('updateMilestone verifies ownership through the parent goal before updating', async () => {
      prisma.goalMilestone.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMilestone(otherUserId, 'milestone-1', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.goalMilestone.update).not.toHaveBeenCalled();
    });

    it('updateMilestone stamps completedAt when transitioning to completed', async () => {
      prisma.goalMilestone.findFirst.mockResolvedValue(
        makeMilestone({ completed: false }),
      );
      prisma.goalMilestone.update.mockResolvedValue(
        makeMilestone({ completed: true, completedAt: new Date() }),
      );

      await service.updateMilestone(userId, 'milestone-1', { completed: true });

      expect(prisma.goalMilestone.update).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.goalMilestone.update>[0]>({
          data: matching({
            completed: true,
            completedAt: expect.any(Date) as Date,
          }),
        }),
      );
    });

    it('updateMilestone clears completedAt when un-completing', async () => {
      prisma.goalMilestone.findFirst.mockResolvedValue(
        makeMilestone({ completed: true, completedAt: new Date() }),
      );
      prisma.goalMilestone.update.mockResolvedValue(
        makeMilestone({ completed: false, completedAt: null }),
      );

      await service.updateMilestone(userId, 'milestone-1', {
        completed: false,
      });

      expect(prisma.goalMilestone.update).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.goalMilestone.update>[0]>({
          data: matching({ completed: false, completedAt: null }),
        }),
      );
    });

    it('removeMilestone verifies ownership through the parent goal, then hard-deletes', async () => {
      prisma.goalMilestone.findFirst.mockResolvedValue(makeMilestone());

      await service.removeMilestone(userId, 'milestone-1');

      expect(prisma.goalMilestone.delete).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
      });
    });

    it('removeMilestone throws NotFoundException for someone else’s milestone', async () => {
      prisma.goalMilestone.findFirst.mockResolvedValue(null);

      await expect(
        service.removeMilestone(otherUserId, 'milestone-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.goalMilestone.delete).not.toHaveBeenCalled();
    });
  });

  describe('cross-user isolation', () => {
    it('findMilestoneOrThrow scopes its Prisma lookup through goal.userId', async () => {
      prisma.goalMilestone.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMilestone(otherUserId, 'milestone-1', {}),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.goalMilestone.findFirst).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.goalMilestone.findFirst>[0]>({
          where: matching({
            id: 'milestone-1',
            goal: matching({ userId: otherUserId }),
          }),
        }),
      );
    });

    it('a goal that exists for a different user resolves as not found, never forbidden', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(otherUserId, 'goal-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
