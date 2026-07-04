import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  HabitFrequency,
  Prisma,
  type Habit,
  type HabitLog,
} from '../../../generated/prisma/index.js';
import { HabitsService } from './habits.service.js';

// `expect.objectContaining()` types as `any`; nesting it as a property value inside another
// object literal trips `@typescript-eslint/no-unsafe-assignment`. This gives the same matcher a
// concrete type instead — same helper used in tasks.service.spec.ts / routines.service.spec.ts.
function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('HabitsService', () => {
  let service: HabitsService;
  let prisma: {
    habit: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    habitLog: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    goal: { findFirst: jest.Mock };
  };

  const userId = 'user-1';
  const today = new Date('2026-07-03T00:00:00.000Z');

  const mockHabit: Habit = {
    id: 'habit-1',
    userId,
    name: 'Drink water',
    description: null,
    icon: 'local_drink',
    color: '#03A9F4',
    targetFrequency: HabitFrequency.DAILY,
    targetCount: 8,
    category: null,
    reminderTime: null,
    isActive: true,
    goalId: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const mockLog: HabitLog = {
    id: 'log-1',
    habitId: mockHabit.id,
    date: today,
    completedCount: 3,
    notes: null,
    createdAt: new Date('2026-07-03T09:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-03T12:00:00.000Z'));

    prisma = {
      habit: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      habitLog: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      goal: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HabitsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(HabitsService);
  });

  afterEach(() => jest.useRealTimers());

  describe('findAll', () => {
    it('scopes the query to the requesting user and excludes soft-deleted habits', async () => {
      prisma.habit.findMany.mockResolvedValue([mockHabit]);
      prisma.habit.count.mockResolvedValue(1);
      prisma.habitLog.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId, {});

      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.HabitWhereInput>({ userId, deletedAt: null }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('applies isActive, targetFrequency, category, and search filters', async () => {
      prisma.habit.findMany.mockResolvedValue([]);
      prisma.habit.count.mockResolvedValue(0);

      await service.findAll(userId, {
        isActive: true,
        targetFrequency: HabitFrequency.WEEKLY,
        category: 'Health',
        search: 'water',
      });

      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.HabitWhereInput>({
            isActive: true,
            targetFrequency: HabitFrequency.WEEKLY,
            category: 'Health',
            name: { contains: 'water', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('paginates using page/pageSize and computes totalPages', async () => {
      prisma.habit.findMany.mockResolvedValue([]);
      prisma.habit.count.mockResolvedValue(45);
      prisma.habitLog.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId, { page: 2, pageSize: 20 });

      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
      expect(result.meta).toEqual({
        page: 2,
        pageSize: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('sorts using sortBy/sortOrder for database-backed fields', async () => {
      prisma.habit.findMany.mockResolvedValue([]);
      prisma.habit.count.mockResolvedValue(0);

      await service.findAll(userId, { sortBy: 'name', sortOrder: 'asc' });

      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('sorts by completionPercent in-memory when requested', async () => {
      const lowProgress = { ...mockHabit, id: 'habit-low', targetCount: 10 };
      const highProgress = { ...mockHabit, id: 'habit-high', targetCount: 2 };
      prisma.habit.findMany.mockResolvedValue([lowProgress, highProgress]);
      prisma.habitLog.findMany.mockResolvedValue([
        { ...mockLog, habitId: 'habit-low', completedCount: 1 },
        { ...mockLog, habitId: 'habit-high', completedCount: 2 },
      ]);

      const result = await service.findAll(userId, {
        sortBy: 'completionPercent',
        sortOrder: 'desc',
      });

      // No skip/take at the database level — every matching row is fetched and sorted in memory.
      expect(prisma.habit.findMany).toHaveBeenCalledWith({
        where: matching<Prisma.HabitWhereInput>({ userId, deletedAt: null }),
      });
      expect(result.data.map((habit) => habit.id)).toEqual([
        'habit-high',
        'habit-low',
      ]);
    });
  });

  describe('findOne', () => {
    it('returns the habit with computed progress when owned by the user', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habitLog.findMany.mockResolvedValue([mockLog]);

      const result = await service.findOne(userId, mockHabit.id);

      expect(prisma.habit.findFirst).toHaveBeenCalledWith({
        where: { id: mockHabit.id, userId, deletedAt: null },
      });
      expect(result.currentPeriodCount).toBe(3);
      expect(result.completionPercent).toBe(38); // round(3/8 * 100)
      expect(result.completedToday).toBe(true);
    });

    it('throws NotFoundException when the habit does not exist or belongs to someone else', async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(userId, 'someone-elses-habit'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('rejects a duplicate habit name for the same user', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);

      await expect(
        service.create(userId, {
          name: mockHabit.name,
          icon: 'x',
          color: '#000',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.habit.create).not.toHaveBeenCalled();
    });

    it('creates a habit scoped to the user, defaulting frequency/targetCount/isActive', async () => {
      prisma.habit.findFirst.mockResolvedValue(null);
      prisma.habit.create.mockResolvedValue(mockHabit);
      prisma.habitLog.findMany.mockResolvedValue([]);

      const result = await service.create(userId, {
        name: 'Drink water',
        icon: 'local_drink',
        color: '#03A9F4',
      });

      expect(prisma.habit.create).toHaveBeenCalledWith({
        data: matching<Prisma.HabitUncheckedCreateInput>({
          userId,
          name: 'Drink water',
          targetFrequency: HabitFrequency.DAILY,
          targetCount: 1,
          isActive: true,
        }),
      });
      expect(result.id).toBe(mockHabit.id);
    });
  });

  describe('update', () => {
    it('throws NotFoundException without checking name when not owned', async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, 'not-mine', { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.habit.update).not.toHaveBeenCalled();
    });

    it('rejects renaming to a name already used by another of the user’s habits', async () => {
      prisma.habit.findFirst
        .mockResolvedValueOnce(mockHabit) // findHabitOrThrow
        .mockResolvedValueOnce({ ...mockHabit, id: 'other-habit' }); // assertNameAvailable

      await expect(
        service.update(userId, mockHabit.id, { name: 'Taken name' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.habit.update).not.toHaveBeenCalled();
    });

    it('excludes the habit itself from the duplicate-name check', async () => {
      prisma.habit.findFirst
        .mockResolvedValueOnce(mockHabit)
        .mockResolvedValueOnce(null);
      prisma.habit.update.mockResolvedValue({
        ...mockHabit,
        name: 'Drink more water',
      });
      prisma.habitLog.findMany.mockResolvedValue([]);

      await service.update(userId, mockHabit.id, { name: 'Drink more water' });

      expect(prisma.habit.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: matching<Prisma.HabitWhereInput>({
            id: { not: mockHabit.id },
          }),
        }),
      );
      expect(prisma.habit.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting deletedAt instead of removing the row', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habit.update.mockResolvedValue({
        ...mockHabit,
        deletedAt: new Date(),
      });

      await service.remove(userId, mockHabit.id);

      expect(prisma.habit.update).toHaveBeenCalledWith({
        where: { id: mockHabit.id },
        data: { deletedAt: expect.any(Date) as Date },
      });
    });

    it('throws NotFoundException when not owned', async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, 'not-mine')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createLog', () => {
    it('throws NotFoundException when the habit is not owned', async () => {
      prisma.habit.findFirst.mockResolvedValue(null);

      await expect(service.createLog(userId, 'not-mine', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a duplicate log for the same habit/date', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habitLog.findUnique.mockResolvedValue(mockLog);

      await expect(
        service.createLog(userId, mockHabit.id, { date: '2026-07-03' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.habitLog.create).not.toHaveBeenCalled();
    });

    it('defaults date to today and completedCount to 1 when omitted', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habitLog.findUnique.mockResolvedValue(null);
      prisma.habitLog.create.mockResolvedValue(mockLog);

      await service.createLog(userId, mockHabit.id, {});

      expect(prisma.habitLog.create).toHaveBeenCalledWith({
        data: matching<Prisma.HabitLogUncheckedCreateInput>({
          habitId: mockHabit.id,
          date: today,
          completedCount: 1,
        }),
      });
    });
  });

  describe('updateLog', () => {
    it('throws NotFoundException when no log exists for the date', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habitLog.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLog(userId, mockHabit.id, { date: '2026-07-03' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.habitLog.update).not.toHaveBeenCalled();
    });

    it('patches only the supplied fields', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habitLog.findUnique.mockResolvedValue(mockLog);
      prisma.habitLog.update.mockResolvedValue({
        ...mockLog,
        notes: 'Felt great',
      });

      await service.updateLog(userId, mockHabit.id, { notes: 'Felt great' });

      expect(prisma.habitLog.update).toHaveBeenCalledWith({
        where: { id: mockLog.id },
        data: { notes: 'Felt great' },
      });
    });
  });

  describe('removeLog', () => {
    it('throws NotFoundException when no log exists for the date', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habitLog.findUnique.mockResolvedValue(null);

      await expect(service.removeLog(userId, mockHabit.id)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.habitLog.delete).not.toHaveBeenCalled();
    });

    it('deletes the log for the resolved date', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habitLog.findUnique.mockResolvedValue(mockLog);

      await service.removeLog(userId, mockHabit.id, '2026-07-03');

      expect(prisma.habitLog.delete).toHaveBeenCalledWith({
        where: { id: mockLog.id },
      });
    });
  });

  describe('today', () => {
    it('only returns active, non-deleted habits', async () => {
      prisma.habit.findMany.mockResolvedValue([mockHabit]);
      prisma.habitLog.findMany.mockResolvedValue([]);

      await service.today(userId);

      expect(prisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.HabitWhereInput>({
            userId,
            deletedAt: null,
            isActive: true,
          }),
        }),
      );
    });
  });

  describe('summary', () => {
    it('returns zeros when the user has no active habits', async () => {
      prisma.habit.findMany.mockResolvedValue([]);

      const result = await service.summary(userId);

      expect(result).toEqual({
        habitsCompletedToday: 0,
        totalActiveHabits: 0,
        completionPercentage: 0,
      });
      expect(prisma.habitLog.findMany).not.toHaveBeenCalled();
    });

    it('computes completedToday count and percentage from today’s logs', async () => {
      const secondHabit = { ...mockHabit, id: 'habit-2' };
      prisma.habit.findMany.mockResolvedValue([mockHabit, secondHabit]);
      prisma.habitLog.findMany.mockResolvedValue([mockLog]); // only habit-1 logged today

      const result = await service.summary(userId);

      expect(result).toEqual({
        habitsCompletedToday: 1,
        totalActiveHabits: 2,
        completionPercentage: 50,
      });
    });
  });

  describe('history', () => {
    it('scopes to a single habit when habitId is given, verifying ownership', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.habitLog.findMany.mockResolvedValue([mockLog]);
      prisma.habitLog.count.mockResolvedValue(1);

      const result = await service.history(userId, { habitId: mockHabit.id });

      expect(prisma.habit.findFirst).toHaveBeenCalledWith({
        where: { id: mockHabit.id, userId, deletedAt: null },
      });
      expect(prisma.habitLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.HabitLogWhereInput>({
            habitId: { in: [mockHabit.id] },
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('scopes to all of the user’s own habits when habitId is omitted', async () => {
      prisma.habit.findMany.mockResolvedValue([
        { id: 'habit-1' },
        { id: 'habit-2' },
      ]);
      prisma.habitLog.findMany.mockResolvedValue([]);
      prisma.habitLog.count.mockResolvedValue(0);

      await service.history(userId, {});

      expect(prisma.habit.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: { id: true },
      });
      expect(prisma.habitLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.HabitLogWhereInput>({
            habitId: { in: ['habit-1', 'habit-2'] },
          }),
        }),
      );
    });

    it('applies dateFrom/dateTo range filters', async () => {
      prisma.habit.findMany.mockResolvedValue([{ id: 'habit-1' }]);
      prisma.habitLog.findMany.mockResolvedValue([]);
      prisma.habitLog.count.mockResolvedValue(0);

      await service.history(userId, {
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
      });

      expect(prisma.habitLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.HabitLogWhereInput>({
            date: {
              gte: new Date('2026-06-01T00:00:00.000Z'),
              lte: new Date('2026-06-30T00:00:00.000Z'),
            },
          }),
        }),
      );
    });
  });

  describe('goalId linking (Milestone 9)', () => {
    it('create rejects a goalId that does not belong to the same user', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          name: 'Drink water',
          icon: 'local_drink',
          color: '#03A9F4',
          goalId: 'someone-elses-goal',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.habit.create).not.toHaveBeenCalled();
    });

    it('update rejects a goalId that does not belong to the same user', async () => {
      prisma.habit.findFirst.mockResolvedValue(mockHabit);
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, mockHabit.id, { goalId: 'someone-elses-goal' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.habit.update).not.toHaveBeenCalled();
    });
  });

  describe('countLogsByGoal', () => {
    it('counts logs for habits linked to this goal, scoped to this user', async () => {
      prisma.habitLog.count.mockResolvedValue(12);

      const result = await service.countLogsByGoal(userId, 'goal-1');

      expect(prisma.habitLog.count).toHaveBeenCalledWith({
        where: { habit: { userId, goalId: 'goal-1', deletedAt: null } },
      });
      expect(result).toBe(12);
    });
  });
});
