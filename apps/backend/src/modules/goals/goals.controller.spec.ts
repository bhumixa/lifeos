import { Test, TestingModule } from '@nestjs/testing';
import {
  GoalPriority,
  GoalStatus,
  GoalTargetType,
} from '../../../generated/prisma/index.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { GoalResponseDto } from './dto/goal-response.dto.js';
import { GoalsController } from './goals.controller.js';
import { GoalsService } from './goals.service.js';

describe('GoalsController', () => {
  let controller: GoalsController;
  let goalsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    archive: jest.Mock;
    unarchive: jest.Mock;
    getProgress: jest.Mock;
    addMilestone: jest.Mock;
    updateMilestone: jest.Mock;
    removeMilestone: jest.Mock;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  const mockGoal: GoalResponseDto = {
    id: 'goal-1',
    title: 'Run a half marathon',
    description: null,
    icon: 'flag',
    color: '#3F51B5',
    category: null,
    priority: GoalPriority.MEDIUM,
    targetType: GoalTargetType.TASK_COUNT,
    targetValue: 10,
    currentValue: 0,
    progressPercent: 0,
    startDate: null,
    targetDate: null,
    status: GoalStatus.NOT_STARTED,
    archived: false,
    milestones: [],
    milestonesCompletedCount: 0,
    milestonesTotalCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    goalsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      archive: jest.fn(),
      unarchive: jest.fn(),
      getProgress: jest.fn(),
      addMilestone: jest.fn(),
      updateMilestone: jest.fn(),
      removeMilestone: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [{ provide: GoalsService, useValue: goalsService }],
    }).compile();

    controller = module.get(GoalsController);
  });

  it('findAll delegates to GoalsService with the current user id', async () => {
    goalsService.findAll.mockResolvedValue({
      data: [mockGoal],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const result = await controller.findAll(currentUser, {});

    expect(goalsService.findAll).toHaveBeenCalledWith(currentUser.id, {});
    expect(result.data).toEqual([mockGoal]);
  });

  it('findOne delegates to GoalsService with the current user id', async () => {
    goalsService.findOne.mockResolvedValue(mockGoal);

    const result = await controller.findOne(currentUser, mockGoal.id);

    expect(goalsService.findOne).toHaveBeenCalledWith(
      currentUser.id,
      mockGoal.id,
    );
    expect(result).toBe(mockGoal);
  });

  it('create delegates to GoalsService with the current user id', async () => {
    goalsService.create.mockResolvedValue(mockGoal);
    const dto = {
      title: 'Run a half marathon',
      icon: 'flag',
      color: '#3F51B5',
      targetType: GoalTargetType.TASK_COUNT,
      targetValue: 10,
    };

    const result = await controller.create(currentUser, dto);

    expect(goalsService.create).toHaveBeenCalledWith(currentUser.id, dto);
    expect(result).toBe(mockGoal);
  });

  it('update delegates to GoalsService with the current user id', async () => {
    goalsService.update.mockResolvedValue(mockGoal);
    const dto = { title: 'Updated title' };

    const result = await controller.update(currentUser, mockGoal.id, dto);

    expect(goalsService.update).toHaveBeenCalledWith(
      currentUser.id,
      mockGoal.id,
      dto,
    );
    expect(result).toBe(mockGoal);
  });

  it('remove delegates to GoalsService with the current user id', async () => {
    goalsService.remove.mockResolvedValue(undefined);

    await controller.remove(currentUser, mockGoal.id);

    expect(goalsService.remove).toHaveBeenCalledWith(
      currentUser.id,
      mockGoal.id,
    );
  });

  it('archive delegates to GoalsService with the current user id', async () => {
    goalsService.archive.mockResolvedValue({ ...mockGoal, archived: true });

    const result = await controller.archive(currentUser, mockGoal.id);

    expect(goalsService.archive).toHaveBeenCalledWith(
      currentUser.id,
      mockGoal.id,
    );
    expect(result.archived).toBe(true);
  });

  it('unarchive delegates to GoalsService with the current user id', async () => {
    goalsService.unarchive.mockResolvedValue(mockGoal);

    await controller.unarchive(currentUser, mockGoal.id);

    expect(goalsService.unarchive).toHaveBeenCalledWith(
      currentUser.id,
      mockGoal.id,
    );
  });

  it('getProgress delegates to GoalsService with the current user id', async () => {
    goalsService.getProgress.mockResolvedValue({
      goalId: mockGoal.id,
      targetType: mockGoal.targetType,
      targetValue: mockGoal.targetValue,
      currentValue: 4,
      progressPercent: 40,
      remainingValue: 6,
      isComplete: false,
    });

    const result = await controller.getProgress(currentUser, mockGoal.id);

    expect(goalsService.getProgress).toHaveBeenCalledWith(
      currentUser.id,
      mockGoal.id,
    );
    expect(result.currentValue).toBe(4);
  });

  it('addMilestone delegates to GoalsService with the current user id', async () => {
    const dto = { title: 'Complete a 10k run' };
    goalsService.addMilestone.mockResolvedValue({
      id: 'milestone-1',
      goalId: mockGoal.id,
      title: dto.title,
      description: null,
      dueDate: null,
      completed: false,
      completedAt: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await controller.addMilestone(currentUser, mockGoal.id, dto);

    expect(goalsService.addMilestone).toHaveBeenCalledWith(
      currentUser.id,
      mockGoal.id,
      dto,
    );
  });

  it('updateMilestone delegates to GoalsService with the current user id', async () => {
    const dto = { completed: true };
    goalsService.updateMilestone.mockResolvedValue({});

    await controller.updateMilestone(currentUser, 'milestone-1', dto);

    expect(goalsService.updateMilestone).toHaveBeenCalledWith(
      currentUser.id,
      'milestone-1',
      dto,
    );
  });

  it('removeMilestone delegates to GoalsService with the current user id', async () => {
    goalsService.removeMilestone.mockResolvedValue(undefined);

    await controller.removeMilestone(currentUser, 'milestone-1');

    expect(goalsService.removeMilestone).toHaveBeenCalledWith(
      currentUser.id,
      'milestone-1',
    );
  });
});
