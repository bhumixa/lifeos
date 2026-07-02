import { Test, TestingModule } from '@nestjs/testing';
import {
  TaskPriority,
  TaskStatus,
  type Task,
} from '../../../generated/prisma/index.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    complete: jest.Mock;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'ada@example.com',
    role: 'STANDARD',
  };

  const mockTask: Task = {
    id: 'task-1',
    userId: currentUser.id,
    title: 'Write report',
    description: null,
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
    dueDate: null,
    estimatedMinutes: null,
    completedAt: null,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    tasksService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      complete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: tasksService }],
    }).compile();

    controller = module.get(TasksController);
  });

  it('findAll delegates to TasksService with the current user id', async () => {
    tasksService.findAll.mockResolvedValue({
      data: [mockTask],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const result = await controller.findAll(currentUser, {});

    expect(tasksService.findAll).toHaveBeenCalledWith(currentUser.id, {});
    expect(result.data).toEqual([mockTask]);
  });

  it('findOne delegates to TasksService with the current user id', async () => {
    tasksService.findOne.mockResolvedValue(mockTask);

    const result = await controller.findOne(currentUser, mockTask.id);

    expect(tasksService.findOne).toHaveBeenCalledWith(
      currentUser.id,
      mockTask.id,
    );
    expect(result).toBe(mockTask);
  });

  it('create delegates to TasksService with the current user id', async () => {
    tasksService.create.mockResolvedValue(mockTask);

    const result = await controller.create(currentUser, {
      title: 'Write report',
    });

    expect(tasksService.create).toHaveBeenCalledWith(currentUser.id, {
      title: 'Write report',
    });
    expect(result).toBe(mockTask);
  });

  it('update delegates to TasksService with the current user id', async () => {
    tasksService.update.mockResolvedValue({ ...mockTask, title: 'Updated' });

    const result = await controller.update(currentUser, mockTask.id, {
      title: 'Updated',
    });

    expect(tasksService.update).toHaveBeenCalledWith(
      currentUser.id,
      mockTask.id,
      { title: 'Updated' },
    );
    expect(result.title).toBe('Updated');
  });

  it('remove delegates to TasksService with the current user id', async () => {
    tasksService.remove.mockResolvedValue(undefined);

    await controller.remove(currentUser, mockTask.id);

    expect(tasksService.remove).toHaveBeenCalledWith(
      currentUser.id,
      mockTask.id,
    );
  });

  it('complete delegates to TasksService with the current user id', async () => {
    tasksService.complete.mockResolvedValue({
      ...mockTask,
      status: TaskStatus.COMPLETED,
    });

    const result = await controller.complete(currentUser, mockTask.id);

    expect(tasksService.complete).toHaveBeenCalledWith(
      currentUser.id,
      mockTask.id,
    );
    expect(result.status).toBe(TaskStatus.COMPLETED);
  });
});
