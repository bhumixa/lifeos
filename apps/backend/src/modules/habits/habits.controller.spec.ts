import { Test, TestingModule } from '@nestjs/testing';
import { HabitFrequency } from '../../../generated/prisma/index.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { HabitsController } from './habits.controller.js';
import { HabitsService } from './habits.service.js';

describe('HabitsController', () => {
  let controller: HabitsController;
  let habitsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    createLog: jest.Mock;
    updateLog: jest.Mock;
    removeLog: jest.Mock;
    today: jest.Mock;
    summary: jest.Mock;
    history: jest.Mock;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  const mockHabitResponse = {
    id: 'habit-1',
    name: 'Drink water',
    description: null,
    icon: 'local_drink',
    color: '#03A9F4',
    targetFrequency: HabitFrequency.DAILY,
    targetCount: 8,
    category: null,
    reminderTime: null,
    isActive: true,
    currentPeriodCount: 3,
    completionPercent: 38,
    completedToday: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLogResponse = {
    id: 'log-1',
    habitId: mockHabitResponse.id,
    date: new Date(),
    completedCount: 1,
    notes: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    habitsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createLog: jest.fn(),
      updateLog: jest.fn(),
      removeLog: jest.fn(),
      today: jest.fn(),
      summary: jest.fn(),
      history: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HabitsController],
      providers: [{ provide: HabitsService, useValue: habitsService }],
    }).compile();

    controller = module.get(HabitsController);
  });

  it('findAll delegates to HabitsService with the current user id', async () => {
    habitsService.findAll.mockResolvedValue({
      data: [mockHabitResponse],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const result = await controller.findAll(currentUser, {});

    expect(habitsService.findAll).toHaveBeenCalledWith(currentUser.id, {});
    expect(result.data).toEqual([mockHabitResponse]);
  });

  it('today delegates to HabitsService with the current user id', async () => {
    habitsService.today.mockResolvedValue([mockHabitResponse]);

    const result = await controller.today(currentUser);

    expect(habitsService.today).toHaveBeenCalledWith(currentUser.id);
    expect(result).toEqual([mockHabitResponse]);
  });

  it('summary delegates to HabitsService with the current user id', async () => {
    const summary = {
      habitsCompletedToday: 1,
      totalActiveHabits: 2,
      completionPercentage: 50,
    };
    habitsService.summary.mockResolvedValue(summary);

    const result = await controller.summary(currentUser);

    expect(habitsService.summary).toHaveBeenCalledWith(currentUser.id);
    expect(result).toEqual(summary);
  });

  it('history delegates to HabitsService with the current user id', async () => {
    habitsService.history.mockResolvedValue({
      data: [mockLogResponse],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const result = await controller.history(currentUser, {});

    expect(habitsService.history).toHaveBeenCalledWith(currentUser.id, {});
    expect(result.data).toEqual([mockLogResponse]);
  });

  it('findOne delegates to HabitsService with the current user id', async () => {
    habitsService.findOne.mockResolvedValue(mockHabitResponse);

    const result = await controller.findOne(currentUser, mockHabitResponse.id);

    expect(habitsService.findOne).toHaveBeenCalledWith(
      currentUser.id,
      mockHabitResponse.id,
    );
    expect(result).toEqual(mockHabitResponse);
  });

  it('create delegates to HabitsService with the current user id', async () => {
    habitsService.create.mockResolvedValue(mockHabitResponse);

    const result = await controller.create(currentUser, {
      name: 'Drink water',
      icon: 'local_drink',
      color: '#03A9F4',
    });

    expect(habitsService.create).toHaveBeenCalledWith(currentUser.id, {
      name: 'Drink water',
      icon: 'local_drink',
      color: '#03A9F4',
    });
    expect(result).toEqual(mockHabitResponse);
  });

  it('update delegates to HabitsService with the current user id', async () => {
    habitsService.update.mockResolvedValue({
      ...mockHabitResponse,
      name: 'Updated',
    });

    const result = await controller.update(currentUser, mockHabitResponse.id, {
      name: 'Updated',
    });

    expect(habitsService.update).toHaveBeenCalledWith(
      currentUser.id,
      mockHabitResponse.id,
      {
        name: 'Updated',
      },
    );
    expect(result.name).toBe('Updated');
  });

  it('remove delegates to HabitsService with the current user id', async () => {
    habitsService.remove.mockResolvedValue(undefined);

    await controller.remove(currentUser, mockHabitResponse.id);

    expect(habitsService.remove).toHaveBeenCalledWith(
      currentUser.id,
      mockHabitResponse.id,
    );
  });

  it('createLog delegates to HabitsService with the current user id', async () => {
    habitsService.createLog.mockResolvedValue(mockLogResponse);

    const result = await controller.createLog(
      currentUser,
      mockHabitResponse.id,
      {},
    );

    expect(habitsService.createLog).toHaveBeenCalledWith(
      currentUser.id,
      mockHabitResponse.id,
      {},
    );
    expect(result).toEqual(mockLogResponse);
  });

  it('updateLog delegates to HabitsService with the current user id', async () => {
    habitsService.updateLog.mockResolvedValue({
      ...mockLogResponse,
      notes: 'Updated',
    });

    const result = await controller.updateLog(
      currentUser,
      mockHabitResponse.id,
      {
        notes: 'Updated',
      },
    );

    expect(habitsService.updateLog).toHaveBeenCalledWith(
      currentUser.id,
      mockHabitResponse.id,
      {
        notes: 'Updated',
      },
    );
    expect(result.notes).toBe('Updated');
  });

  it('removeLog delegates to HabitsService with the current user id and date', async () => {
    habitsService.removeLog.mockResolvedValue(undefined);

    await controller.removeLog(currentUser, mockHabitResponse.id, {
      date: '2026-07-03',
    });

    expect(habitsService.removeLog).toHaveBeenCalledWith(
      currentUser.id,
      mockHabitResponse.id,
      '2026-07-03',
    );
  });
});
