import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  PlannerBlockType,
  TaskPriority,
  TaskStatus,
  type PlannerBlock,
  type PlannerDay,
} from '../../../generated/prisma/index.js';
import { HabitsService } from '../habits/habits.service.js';
import { RoutinesService } from '../routines/routines.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { PlannerService } from './planner.service.js';

// Same helper as habits.service.spec.ts / tasks.service.spec.ts — types an objectContaining
// matcher concretely so it doesn't trip @typescript-eslint/no-unsafe-assignment.
function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

interface CreateBlockCallArg {
  data: { type: PlannerBlockType; referenceId: string | null; startTime: Date };
}

/** Extracts the `data` argument of every `prisma.plannerBlock.create` call of a given `type` —
 * typed concretely so indexing into it doesn't trip @typescript-eslint/no-unsafe-member-access
 * the way indexing `jest.Mock.mock.calls` (typed `any[][]`) directly would. */
function createdBlocksOfType(
  mock: jest.Mock,
  type: PlannerBlockType,
): CreateBlockCallArg['data'][] {
  return (mock.mock.calls as [CreateBlockCallArg][])
    .filter(([arg]) => arg.data.type === type)
    .map(([arg]) => arg.data);
}

describe('PlannerService', () => {
  let service: PlannerService;
  let prisma: {
    user: { findUnique: jest.Mock };
    plannerDay: { findUnique: jest.Mock; create: jest.Mock };
    plannerBlock: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tasksService: {
    findAll: jest.Mock;
    update: jest.Mock;
    complete: jest.Mock;
  };
  let routinesService: { findAll: jest.Mock };
  let habitsService: {
    today: jest.Mock;
    createLog: jest.Mock;
    update: jest.Mock;
  };

  const userId = 'user-1';

  const mockDay: PlannerDay = {
    id: 'day-1',
    userId,
    date: new Date('2026-07-03T00:00:00.000Z'),
    notes: null,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
  };

  const makeBlock = (overrides: Partial<PlannerBlock>): PlannerBlock => ({
    id: 'block-1',
    plannerDayId: mockDay.id,
    type: PlannerBlockType.CUSTOM,
    referenceId: null,
    title: 'Block',
    description: null,
    startTime: new Date('2026-07-03T12:00:00.000Z'),
    endTime: new Date('2026-07-03T12:30:00.000Z'),
    duration: 30,
    color: null,
    completed: false,
    order: 0,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T12:00:00.000Z'));

    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ timezone: 'UTC' }) },
      plannerDay: { findUnique: jest.fn(), create: jest.fn() },
      plannerBlock: {
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    tasksService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      update: jest.fn(),
      complete: jest.fn(),
    };
    routinesService = { findAll: jest.fn().mockResolvedValue([]) };
    habitsService = {
      today: jest.fn().mockResolvedValue([]),
      createLog: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        { provide: PrismaService, useValue: prisma },
        { provide: TasksService, useValue: tasksService },
        { provide: RoutinesService, useValue: routinesService },
        { provide: HabitsService, useValue: habitsService },
      ],
    }).compile();

    service = module.get(PlannerService);
  });

  afterEach(() => jest.useRealTimers());

  describe('today / getByDate', () => {
    it("resolves 'today' using the user's own timezone, not the server's", async () => {
      // 2026-07-03T12:00:00Z is already 2026-07-04 in a UTC+14 zone.
      prisma.user.findUnique.mockResolvedValue({
        timezone: 'Pacific/Kiritimati',
      });
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [],
      });

      await service.today(userId);

      expect(prisma.plannerDay.findUnique).toHaveBeenCalledWith(
        matching({
          where: {
            userId_date: { userId, date: new Date('2026-07-04T00:00:00.000Z') },
          },
        }),
      );
    });

    it('creates the day on first access rather than requiring a separate provisioning step', async () => {
      prisma.plannerDay.findUnique.mockResolvedValue(null);
      prisma.plannerDay.create.mockResolvedValue({ ...mockDay, blocks: [] });

      const result = await service.getByDate(userId, '2026-07-03');

      expect(prisma.plannerDay.create).toHaveBeenCalledWith(
        matching({
          data: { userId, date: new Date('2026-07-03T00:00:00.000Z') },
        }),
      );
      expect(result.date).toBe('2026-07-03');
      expect(result.blocks).toEqual([]);
    });

    it('returns blocks sorted by order', async () => {
      const block1 = makeBlock({ id: 'b1', order: 1 });
      const block2 = makeBlock({ id: 'b2', order: 0 });
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [block1, block2],
      });

      const result = await service.getByDate(userId, '2026-07-03');

      expect(result.blocks.map((b) => b.id)).toEqual(['b2', 'b1']);
    });
  });

  describe('createBlock', () => {
    it('derives duration from startTime/endTime rather than trusting a client-supplied value', async () => {
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [],
      });
      prisma.plannerBlock.findFirst.mockResolvedValue(null);

      await service.createBlock(userId, {
        type: PlannerBlockType.FOCUS,
        title: 'Deep work',
        startTime: '2026-07-03T09:00:00.000Z',
        endTime: '2026-07-03T10:30:00.000Z',
      });

      expect(prisma.plannerBlock.create).toHaveBeenCalledWith(
        matching({ data: matching({ duration: 90, order: 0 }) }),
      );
    });

    it('rejects an endTime at or before startTime', async () => {
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [],
      });

      await expect(
        service.createBlock(userId, {
          type: PlannerBlockType.FOCUS,
          title: 'Bad range',
          startTime: '2026-07-03T10:00:00.000Z',
          endTime: '2026-07-03T09:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.plannerBlock.create).not.toHaveBeenCalled();
    });

    it('appends after the current highest order when none is supplied', async () => {
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [],
      });
      prisma.plannerBlock.findFirst.mockResolvedValue({ order: 4 });

      await service.createBlock(userId, {
        type: PlannerBlockType.BREAK,
        title: 'Coffee',
        startTime: '2026-07-03T09:00:00.000Z',
        endTime: '2026-07-03T09:15:00.000Z',
      });

      expect(prisma.plannerBlock.create).toHaveBeenCalledWith(
        matching({ data: matching({ order: 5 }) }),
      );
    });
  });

  describe('cross-user security', () => {
    it("treats another user's block as not found (404, not 403) on update", async () => {
      prisma.plannerBlock.findFirst.mockResolvedValue(null);

      await expect(
        service.updateBlock(userId, 'someone-elses-block', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
      // Ownership is enforced by joining through the block's own PlannerDay, not a separate check.
      expect(prisma.plannerBlock.findFirst).toHaveBeenCalledWith(
        matching({
          where: { id: 'someone-elses-block', plannerDay: { userId } },
        }),
      );
    });

    it("treats another user's block as not found on delete", async () => {
      prisma.plannerBlock.findFirst.mockResolvedValue(null);
      await expect(
        service.removeBlock(userId, 'someone-elses-block'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.plannerBlock.delete).not.toHaveBeenCalled();
    });

    it("treats another user's block as not found on complete", async () => {
      prisma.plannerBlock.findFirst.mockResolvedValue(null);
      await expect(
        service.complete(userId, { blockId: 'someone-elses-block' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it("rejects a blockIds list that does not exactly match the day's current blocks", async () => {
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [makeBlock({ id: 'b1' }), makeBlock({ id: 'b2' })],
      });

      await expect(
        service.reorder(userId, { date: '2026-07-03', blockIds: ['b1'] }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('sets order to array index for a valid, complete blockIds list', async () => {
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [makeBlock({ id: 'b1' }), makeBlock({ id: 'b2' })],
      });

      await service.reorder(userId, {
        date: '2026-07-03',
        blockIds: ['b2', 'b1'],
      });

      expect(prisma.plannerBlock.update).toHaveBeenCalledWith({
        where: { id: 'b2' },
        data: { order: 0 },
      });
      expect(prisma.plannerBlock.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { order: 1 },
      });
    });
  });

  describe('complete', () => {
    it("sets only the block's own completed flag and never touches the referenced Task or Habit", async () => {
      const block = makeBlock({
        type: PlannerBlockType.TASK,
        referenceId: 'task-1',
      });
      prisma.plannerBlock.findFirst.mockResolvedValue({
        ...block,
        plannerDay: mockDay,
      });
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [block],
      });

      await service.complete(userId, { blockId: block.id });

      expect(prisma.plannerBlock.update).toHaveBeenCalledWith({
        where: { id: block.id },
        data: { completed: true },
      });
      expect(tasksService.update).not.toHaveBeenCalled();
      expect(tasksService.complete).not.toHaveBeenCalled();
      expect(habitsService.createLog).not.toHaveBeenCalled();
      expect(habitsService.update).not.toHaveBeenCalled();
    });

    it('defaults to completing but accepts an explicit false to un-complete', async () => {
      const block = makeBlock();
      prisma.plannerBlock.findFirst.mockResolvedValue({
        ...block,
        plannerDay: mockDay,
      });
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [block],
      });

      await service.complete(userId, { blockId: block.id, completed: false });

      expect(prisma.plannerBlock.update).toHaveBeenCalledWith({
        where: { id: block.id },
        data: { completed: false },
      });
    });
  });

  describe('generate', () => {
    const task = (
      overrides: Partial<{
        id: string;
        priority: TaskPriority;
        estimatedMinutes: number | null;
      }>,
    ) => ({
      id: 'task-x',
      title: 'A task',
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      estimatedMinutes: null as number | null,
      ...overrides,
    });

    it('places routine steps at their fixed anchor times and skips one that collides with a fixed block', async () => {
      const fixedFocusBlock = makeBlock({
        id: 'fixed-1',
        type: PlannerBlockType.FOCUS,
        startTime: new Date('2026-07-03T12:00:00.000Z'),
        endTime: new Date('2026-07-03T12:30:00.000Z'),
      });
      prisma.plannerDay.findUnique
        .mockResolvedValueOnce({ ...mockDay, blocks: [fixedFocusBlock] })
        .mockResolvedValueOnce({ ...mockDay, blocks: [fixedFocusBlock] });

      routinesService.findAll.mockResolvedValue([
        {
          id: 'r1',
          steps: [
            {
              id: 'step-clear',
              title: 'Morning stretch',
              startTime: '08:00',
              durationMinutes: 30,
              order: 0,
            },
            // Collides with the fixed FOCUS block above (12:00-12:30) — must be skipped, not
            // moved, per "planner should never modify"/"respect routine order" (fixed blocks win).
            {
              id: 'step-blocked',
              title: 'Lunch review',
              startTime: '12:00',
              durationMinutes: 30,
              order: 1,
            },
          ],
        },
      ]);

      await service.generate(userId, { date: '2026-07-03' });

      const routineBlocks = createdBlocksOfType(
        prisma.plannerBlock.create,
        PlannerBlockType.ROUTINE,
      );
      expect(routineBlocks).toHaveLength(1);
      expect(routineBlocks[0].referenceId).toBe('step-clear');
    });

    it('schedules tasks by priority into the earliest free gap, respecting buffer', async () => {
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [],
      });
      tasksService.findAll.mockResolvedValue({
        data: [
          task({ id: 'low', priority: TaskPriority.LOW, estimatedMinutes: 30 }),
          task({
            id: 'critical',
            priority: TaskPriority.CRITICAL,
            estimatedMinutes: 30,
          }),
        ],
        meta: {},
      });

      await service.generate(userId, { date: '2026-07-03', bufferMinutes: 10 });

      const taskBlocks = createdBlocksOfType(
        prisma.plannerBlock.create,
        PlannerBlockType.TASK,
      );
      expect(taskBlocks).toHaveLength(2);
      // Critical is placed first (earliest slot) despite appearing second in the source data.
      expect(taskBlocks[0].referenceId).toBe('critical');
      expect(taskBlocks[0].startTime).toEqual(
        new Date('2026-07-03T07:00:00.000Z'),
      );
      expect(taskBlocks[1].referenceId).toBe('low');
      expect(taskBlocks[1].startTime).toEqual(
        new Date('2026-07-03T07:40:00.000Z'),
      );
    });

    it('reports unscheduled tasks/habits instead of overlapping or dropping them silently', async () => {
      // A single fixed block spans the entire generation window, leaving no room for anything.
      const allDayBlock = makeBlock({
        id: 'all-day',
        type: PlannerBlockType.CUSTOM,
        startTime: new Date('2026-07-03T07:00:00.000Z'),
        endTime: new Date('2026-07-03T22:00:00.000Z'),
      });
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [allDayBlock],
      });
      tasksService.findAll.mockResolvedValue({
        data: [task({ id: 'stuck-task' })],
        meta: {},
      });
      habitsService.today.mockResolvedValue([
        { id: 'stuck-habit', name: 'Read', completedToday: false },
      ]);

      const result = await service.generate(userId, { date: '2026-07-03' });

      expect(result.unscheduledTaskIds).toEqual(['stuck-task']);
      expect(result.unscheduledHabitIds).toEqual(['stuck-habit']);
      expect(
        createdBlocksOfType(prisma.plannerBlock.create, PlannerBlockType.TASK),
      ).toHaveLength(0);
      expect(
        createdBlocksOfType(prisma.plannerBlock.create, PlannerBlockType.HABIT),
      ).toHaveLength(0);
    });

    it('replaces prior TASK/ROUTINE/HABIT blocks on regeneration but preserves FOCUS/BREAK/CUSTOM ones', async () => {
      const staleTaskBlock = makeBlock({
        id: 'stale-task',
        type: PlannerBlockType.TASK,
      });
      const userCustomBlock = makeBlock({
        id: 'user-custom',
        type: PlannerBlockType.CUSTOM,
        startTime: new Date('2026-07-03T18:00:00.000Z'),
        endTime: new Date('2026-07-03T18:30:00.000Z'),
      });
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [staleTaskBlock, userCustomBlock],
      });

      await service.generate(userId, { date: '2026-07-03' });

      expect(prisma.plannerBlock.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['stale-task'] } },
      });
    });

    it('resolves "due today" using the user\'s own timezone, not UTC', async () => {
      prisma.user.findUnique.mockResolvedValue({
        timezone: 'America/New_York',
      });
      prisma.plannerDay.findUnique.mockResolvedValue({
        ...mockDay,
        blocks: [],
      });

      await service.generate(userId, { date: '2026-07-03' });

      // EDT (UTC-4) in July: local midnight July 3 is 04:00 UTC; local midnight July 4 is
      // 2026-07-04T04:00:00.000Z — a naive UTC-midnight boundary would be four hours off.
      expect(tasksService.findAll).toHaveBeenCalledWith(
        userId,
        matching({
          dueFrom: '2026-07-03T04:00:00.000Z',
          dueTo: '2026-07-04T04:00:00.000Z',
        }),
      );
    });
  });
});
