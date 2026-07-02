import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  Prisma,
  TaskPriority,
  TaskStatus,
  type Task,
} from '../../../generated/prisma/index.js';
import { TasksService } from './tasks.service.js';

// `expect.objectContaining()` types as `any`; nesting it as a property value inside another
// object literal (e.g. `{ where: expect.objectContaining({...}) }`) trips
// `@typescript-eslint/no-unsafe-assignment`. This gives the same matcher a concrete type instead.
function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    task: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const userId = 'user-1';

  const mockTask: Task = {
    id: 'task-1',
    userId,
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
    prisma = {
      task: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TasksService);
  });

  describe('findAll', () => {
    it('scopes the query to the requesting user and excludes soft-deleted tasks', async () => {
      prisma.task.findMany.mockResolvedValue([mockTask]);
      prisma.task.count.mockResolvedValue(1);

      const result = await service.findAll(userId, {});

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.TaskWhereInput>({ userId, deletedAt: null }),
        }),
      );
      expect(result.data).toEqual([mockTask]);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('applies status, priority, tag, and search filters', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll(userId, {
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        tag: 'work',
        search: 'report',
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.TaskWhereInput>({
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            tags: { has: 'work' },
            OR: [
              { title: { contains: 'report', mode: 'insensitive' } },
              { description: { contains: 'report', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('applies dueDate and completedAt range filters', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll(userId, {
        dueFrom: '2026-07-01T00:00:00.000Z',
        dueTo: '2026-07-02T00:00:00.000Z',
        completedFrom: '2026-06-01T00:00:00.000Z',
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: matching<Prisma.TaskWhereInput>({
            dueDate: {
              gte: new Date('2026-07-01T00:00:00.000Z'),
              lt: new Date('2026-07-02T00:00:00.000Z'),
            },
            completedAt: { gte: new Date('2026-06-01T00:00:00.000Z') },
          }),
        }),
      );
    });

    it('paginates using page/pageSize and computes totalPages', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(45);

      const result = await service.findAll(userId, { page: 2, pageSize: 20 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
      expect(result.meta).toEqual({
        page: 2,
        pageSize: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it('sorts using sortBy/sortOrder', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll(userId, { sortBy: 'dueDate', sortOrder: 'asc' });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { dueDate: 'asc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the task when owned by the user', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask);

      const result = await service.findOne(userId, mockTask.id);

      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: mockTask.id, userId, deletedAt: null },
      });
      expect(result).toBe(mockTask);
    });

    it('throws NotFoundException when the task does not exist or belongs to someone else', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(userId, 'someone-elses-task'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a task scoped to the user, defaulting tags to an empty array', async () => {
      prisma.task.create.mockResolvedValue(mockTask);

      const result = await service.create(userId, { title: 'Write report' });

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: matching<Prisma.TaskUncheckedCreateInput>({
          userId,
          title: 'Write report',
          tags: [],
        }),
      });
      expect(result).toBe(mockTask);
    });
  });

  describe('update', () => {
    it('verifies ownership before updating', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        title: 'Updated title',
      });

      const result = await service.update(userId, mockTask.id, {
        title: 'Updated title',
      });

      expect(prisma.task.findFirst).toHaveBeenCalled();
      expect(result.title).toBe('Updated title');
    });

    it('throws NotFoundException without calling update when not owned', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, 'not-mine', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('stamps completedAt when status moves to COMPLETED', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });

      await service.update(userId, mockTask.id, {
        status: TaskStatus.COMPLETED,
      });

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: matching<Prisma.TaskUpdateInput>({
            completedAt: expect.any(Date) as Date,
          }),
        }),
      );
    });

    it('clears completedAt when status moves away from COMPLETED', async () => {
      prisma.task.findFirst.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.TODO,
        completedAt: null,
      });

      await service.update(userId, mockTask.id, { status: TaskStatus.TODO });

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: matching<Prisma.TaskUpdateInput>({ completedAt: null }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting deletedAt instead of removing the row', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        deletedAt: new Date(),
      });

      await service.remove(userId, mockTask.id);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        data: { deletedAt: expect.any(Date) as Date },
      });
    });

    it('throws NotFoundException when not owned', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, 'not-mine')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('complete', () => {
    it('sets status to COMPLETED and stamps completedAt', async () => {
      prisma.task.findFirst.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      const result = await service.complete(userId, mockTask.id);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: expect.any(Date) as Date,
        },
      });
      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('throws NotFoundException when not owned', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.complete(userId, 'not-mine')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
