import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { Routine, RoutineStep } from '../../../generated/prisma/index.js';
import { RoutinesService } from './routines.service.js';

// See tasks.service.spec.ts for why nested `expect.objectContaining()` needs a concrete type —
// same fix, reused here.
function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('RoutinesService', () => {
  let service: RoutinesService;
  let prisma: {
    routine: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    routineStep: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const userId = 'user-1';
  const routineId = 'routine-1';

  function makeStep(overrides: Partial<RoutineStep> = {}): RoutineStep {
    return {
      id: 'step-1',
      routineId,
      title: 'Drink water',
      startTime: '07:00',
      durationMinutes: 5,
      order: 0,
      reminderMinutesBefore: null,
      isRequired: true,
      ...overrides,
    };
  }

  function makeRoutine(
    overrides: Partial<Routine> = {},
    steps: RoutineStep[] = [makeStep()],
  ): Routine & { steps: RoutineStep[] } {
    return {
      id: routineId,
      userId,
      name: 'Morning Routine',
      icon: 'wb_sunny',
      color: '#FF9800',
      description: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
      steps,
    };
  }

  beforeEach(async () => {
    prisma = {
      routine: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      routineStep: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutinesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RoutinesService);
  });

  describe('findAll', () => {
    it('scopes by userId and omits the isActive filter when not provided', async () => {
      prisma.routine.findMany.mockResolvedValue([makeRoutine()]);

      const result = await service.findAll(userId, undefined);

      expect(prisma.routine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].totalDurationMinutes).toBe(5);
    });

    it('applies the isActive filter when provided', async () => {
      prisma.routine.findMany.mockResolvedValue([]);

      await service.findAll(userId, false);

      expect(prisma.routine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId, isActive: false } }),
      );
    });

    it('sorts steps by order and sums their duration into totalDurationMinutes', async () => {
      prisma.routine.findMany.mockResolvedValue([
        makeRoutine({}, [
          makeStep({ id: 's2', order: 1, durationMinutes: 10 }),
          makeStep({ id: 's1', order: 0, durationMinutes: 5 }),
        ]),
      ]);

      const [result] = await service.findAll(userId, undefined);

      expect(result.steps.map((s) => s.id)).toEqual(['s1', 's2']);
      expect(result.totalDurationMinutes).toBe(15);
    });
  });

  describe('findOne', () => {
    it('returns the routine when owned by the user', async () => {
      prisma.routine.findFirst.mockResolvedValue(makeRoutine());

      const result = await service.findOne(userId, routineId);

      expect(prisma.routine.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: routineId, userId } }),
      );
      expect(result.id).toBe(routineId);
    });

    it('throws NotFoundException when not found or not owned', async () => {
      prisma.routine.findFirst.mockResolvedValue(null);

      await expect(service.findOne(userId, routineId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a routine with steps, assigning order by array position', async () => {
      prisma.routine.create.mockResolvedValue(makeRoutine());

      await service.create(userId, {
        name: 'Morning Routine',
        icon: 'wb_sunny',
        color: '#FF9800',
        steps: [
          { title: 'Wake up', startTime: '06:30', durationMinutes: 1 },
          { title: 'Stretch', startTime: '06:31', durationMinutes: 10 },
        ],
      });

      expect(prisma.routine.create).toHaveBeenCalledWith(
        matching<{ data: { steps: { create: { order: number }[] } } }>({
          data: matching({
            userId,
            steps: { create: [matching({ order: 0 }), matching({ order: 1 })] },
          }),
        }),
      );
    });

    it('creates a routine without steps when none are given', async () => {
      prisma.routine.create.mockResolvedValue(makeRoutine({}, []));

      await service.create(userId, {
        name: 'Evening Routine',
        icon: 'nights_stay',
        color: '#3F51B5',
      });

      expect(prisma.routine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: matching<{ steps: undefined }>({ steps: undefined }),
        }),
      );
    });
  });

  describe('update', () => {
    it('verifies ownership before updating', async () => {
      prisma.routine.findFirst.mockResolvedValue(makeRoutine());
      prisma.routine.update.mockResolvedValue(makeRoutine({ name: 'Updated' }));

      const result = await service.update(userId, routineId, {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException without updating when not owned', async () => {
      prisma.routine.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, routineId, { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.routine.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('hard-deletes after verifying ownership', async () => {
      prisma.routine.findFirst.mockResolvedValue(makeRoutine());

      await service.remove(userId, routineId);

      expect(prisma.routine.delete).toHaveBeenCalledWith({
        where: { id: routineId },
      });
    });

    it('throws NotFoundException when not owned', async () => {
      prisma.routine.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, routineId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activate / deactivate', () => {
    it('activate sets isActive to true', async () => {
      prisma.routine.findFirst.mockResolvedValue(
        makeRoutine({ isActive: false }),
      );
      prisma.routine.update.mockResolvedValue(makeRoutine({ isActive: true }));

      const result = await service.activate(userId, routineId);

      expect(prisma.routine.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: true } }),
      );
      expect(result.isActive).toBe(true);
    });

    it('deactivate sets isActive to false', async () => {
      prisma.routine.findFirst.mockResolvedValue(
        makeRoutine({ isActive: true }),
      );
      prisma.routine.update.mockResolvedValue(makeRoutine({ isActive: false }));

      const result = await service.deactivate(userId, routineId);

      expect(prisma.routine.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(result.isActive).toBe(false);
    });
  });

  describe('duplicate', () => {
    it('clones the routine with a "(Copy)" suffix and clones its steps', async () => {
      prisma.routine.findFirst.mockResolvedValue(
        makeRoutine({ name: 'Morning Routine' }, [
          makeStep({ id: 's1', order: 0 }),
        ]),
      );
      prisma.routine.create.mockResolvedValue(
        makeRoutine({ id: 'routine-2', name: 'Morning Routine (Copy)' }),
      );

      const result = await service.duplicate(userId, routineId);

      expect(prisma.routine.create).toHaveBeenCalledWith(
        matching<{ data: { name: string; steps: { create: unknown[] } } }>({
          data: matching({
            userId,
            name: 'Morning Routine (Copy)',
            steps: { create: [matching({ title: 'Drink water' })] },
          }),
        }),
      );
      expect(result.name).toBe('Morning Routine (Copy)');
    });
  });

  describe('addStep', () => {
    it('appends a new step at order = max(existing order) + 1', async () => {
      prisma.routine.findFirst
        .mockResolvedValueOnce(
          makeRoutine({}, [
            makeStep({ id: 's1', order: 0 }),
            makeStep({ id: 's2', order: 3 }),
          ]),
        )
        .mockResolvedValueOnce(makeRoutine());

      await service.addStep(userId, routineId, {
        title: 'New step',
        startTime: '08:00',
        durationMinutes: 5,
      });

      expect(prisma.routineStep.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: matching<{ routineId: string; order: number }>({
            routineId,
            order: 4,
          }),
        }),
      );
    });

    it('starts at order 0 for the first step', async () => {
      prisma.routine.findFirst
        .mockResolvedValueOnce(makeRoutine({}, []))
        .mockResolvedValueOnce(makeRoutine());

      await service.addStep(userId, routineId, {
        title: 'First step',
        startTime: '06:00',
        durationMinutes: 5,
      });

      expect(prisma.routineStep.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: matching<{ order: number }>({ order: 0 }),
        }),
      );
    });
  });

  describe('updateStep / removeStep', () => {
    it('updateStep verifies the step belongs to the routine before updating', async () => {
      prisma.routine.findFirst.mockResolvedValue(makeRoutine());
      prisma.routineStep.findFirst.mockResolvedValue(makeStep());

      await service.updateStep(userId, routineId, 'step-1', {
        title: 'Updated title',
      });

      expect(prisma.routineStep.findFirst).toHaveBeenCalledWith({
        where: { id: 'step-1', routineId },
      });
      expect(prisma.routineStep.update).toHaveBeenCalledWith({
        where: { id: 'step-1' },
        data: { title: 'Updated title' },
      });
    });

    it('updateStep throws NotFoundException when the step is not part of the routine', async () => {
      prisma.routine.findFirst.mockResolvedValue(makeRoutine());
      prisma.routineStep.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStep(userId, routineId, 'not-a-step', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('removeStep deletes after verifying ownership', async () => {
      prisma.routine.findFirst.mockResolvedValue(makeRoutine());
      prisma.routineStep.findFirst.mockResolvedValue(makeStep());

      await service.removeStep(userId, routineId, 'step-1');

      expect(prisma.routineStep.delete).toHaveBeenCalledWith({
        where: { id: 'step-1' },
      });
    });
  });

  describe('reorderSteps', () => {
    it('updates each step to its new index-based order', async () => {
      prisma.routine.findFirst.mockResolvedValue(
        makeRoutine({}, [
          makeStep({ id: 's1', order: 0 }),
          makeStep({ id: 's2', order: 1 }),
        ]),
      );

      await service.reorderSteps(userId, routineId, { stepIds: ['s2', 's1'] });

      expect(prisma.routineStep.update).toHaveBeenCalledWith({
        where: { id: 's2' },
        data: { order: 0 },
      });
      expect(prisma.routineStep.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { order: 1 },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects a stepIds list that does not exactly match the routine’s current steps', async () => {
      prisma.routine.findFirst.mockResolvedValue(
        makeRoutine({}, [makeStep({ id: 's1', order: 0 })]),
      );

      await expect(
        service.reorderSteps(userId, routineId, {
          stepIds: ['s1', 'not-a-real-step'],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
