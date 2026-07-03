import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import type { RoutineResponseDto } from './dto/routine-response.dto.js';
import { RoutinesController } from './routines.controller.js';
import { RoutinesService } from './routines.service.js';

describe('RoutinesController', () => {
  let controller: RoutinesController;
  let routinesService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    activate: jest.Mock;
    deactivate: jest.Mock;
    duplicate: jest.Mock;
    addStep: jest.Mock;
    updateStep: jest.Mock;
    removeStep: jest.Mock;
    reorderSteps: jest.Mock;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  const mockRoutine: RoutineResponseDto = {
    id: 'routine-1',
    name: 'Morning Routine',
    icon: 'wb_sunny',
    color: '#FF9800',
    description: null,
    isActive: true,
    steps: [],
    totalDurationMinutes: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    routinesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      duplicate: jest.fn(),
      addStep: jest.fn(),
      updateStep: jest.fn(),
      removeStep: jest.fn(),
      reorderSteps: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutinesController],
      providers: [{ provide: RoutinesService, useValue: routinesService }],
    }).compile();

    controller = module.get(RoutinesController);
  });

  it('findAll passes the current user id and isActive filter through', async () => {
    routinesService.findAll.mockResolvedValue([mockRoutine]);

    const result = await controller.findAll(currentUser, { isActive: true });

    expect(routinesService.findAll).toHaveBeenCalledWith(currentUser.id, true);
    expect(result).toEqual([mockRoutine]);
  });

  it('findOne delegates with the current user id', async () => {
    routinesService.findOne.mockResolvedValue(mockRoutine);

    const result = await controller.findOne(currentUser, mockRoutine.id);

    expect(routinesService.findOne).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
    );
    expect(result).toBe(mockRoutine);
  });

  it('create delegates with the current user id', async () => {
    routinesService.create.mockResolvedValue(mockRoutine);

    await controller.create(currentUser, {
      name: 'Morning Routine',
      icon: 'wb_sunny',
      color: '#FF9800',
    });

    expect(routinesService.create).toHaveBeenCalledWith(currentUser.id, {
      name: 'Morning Routine',
      icon: 'wb_sunny',
      color: '#FF9800',
    });
  });

  it('update delegates with the current user id', async () => {
    routinesService.update.mockResolvedValue({
      ...mockRoutine,
      name: 'Updated',
    });

    const result = await controller.update(currentUser, mockRoutine.id, {
      name: 'Updated',
    });

    expect(routinesService.update).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
      { name: 'Updated' },
    );
    expect(result.name).toBe('Updated');
  });

  it('remove delegates with the current user id', async () => {
    routinesService.remove.mockResolvedValue(undefined);

    await controller.remove(currentUser, mockRoutine.id);

    expect(routinesService.remove).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
    );
  });

  it('activate delegates with the current user id', async () => {
    routinesService.activate.mockResolvedValue({
      ...mockRoutine,
      isActive: true,
    });

    await controller.activate(currentUser, mockRoutine.id);

    expect(routinesService.activate).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
    );
  });

  it('deactivate delegates with the current user id', async () => {
    routinesService.deactivate.mockResolvedValue({
      ...mockRoutine,
      isActive: false,
    });

    await controller.deactivate(currentUser, mockRoutine.id);

    expect(routinesService.deactivate).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
    );
  });

  it('duplicate delegates with the current user id', async () => {
    routinesService.duplicate.mockResolvedValue({
      ...mockRoutine,
      id: 'routine-2',
      name: 'Morning Routine (Copy)',
    });

    const result = await controller.duplicate(currentUser, mockRoutine.id);

    expect(routinesService.duplicate).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
    );
    expect(result.name).toBe('Morning Routine (Copy)');
  });

  it('addStep delegates with the current user id and routine id', async () => {
    routinesService.addStep.mockResolvedValue(mockRoutine);

    await controller.addStep(currentUser, mockRoutine.id, {
      title: 'Drink water',
      startTime: '07:00',
      durationMinutes: 5,
    });

    expect(routinesService.addStep).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
      {
        title: 'Drink water',
        startTime: '07:00',
        durationMinutes: 5,
      },
    );
  });

  it('updateStep delegates with the current user id, routine id, and step id', async () => {
    routinesService.updateStep.mockResolvedValue(mockRoutine);

    await controller.updateStep(currentUser, mockRoutine.id, 'step-1', {
      title: 'Updated',
    });

    expect(routinesService.updateStep).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
      'step-1',
      { title: 'Updated' },
    );
  });

  it('removeStep delegates with the current user id, routine id, and step id', async () => {
    routinesService.removeStep.mockResolvedValue(mockRoutine);

    await controller.removeStep(currentUser, mockRoutine.id, 'step-1');

    expect(routinesService.removeStep).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
      'step-1',
    );
  });

  it('reorderSteps delegates with the current user id and routine id', async () => {
    routinesService.reorderSteps.mockResolvedValue(mockRoutine);

    await controller.reorderSteps(currentUser, mockRoutine.id, {
      stepIds: ['step-2', 'step-1'],
    });

    expect(routinesService.reorderSteps).toHaveBeenCalledWith(
      currentUser.id,
      mockRoutine.id,
      { stepIds: ['step-2', 'step-1'] },
    );
  });
});
