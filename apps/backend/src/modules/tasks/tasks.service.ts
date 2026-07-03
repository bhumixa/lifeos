import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import {
  Prisma,
  TaskStatus,
  type Task,
} from '../../../generated/prisma/index.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { QueryTasksDto } from './dto/query-tasks.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';

/**
 * Every method takes `userId` and scopes its Prisma query with it — this is what makes
 * "users may only access their own tasks" hold everywhere, rather than relying on a single
 * guard that could be bypassed by a future caller. Ownership + existence are checked together
 * (findFirst with both id and userId, not findUnique(id) followed by an owner check) so that a
 * task belonging to another user is indistinguishable from a task that doesn't exist — a 404,
 * not a 403, which avoids confirming other users' task IDs exist.
 */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: QueryTasksDto,
  ): Promise<PaginatedResult<Task>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.TaskWhereInput = {
      userId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...((query.dueFrom ?? query.dueTo) && {
        dueDate: {
          ...(query.dueFrom && { gte: new Date(query.dueFrom) }),
          ...(query.dueTo && { lt: new Date(query.dueTo) }),
        },
      }),
      ...((query.completedFrom ?? query.completedTo) && {
        completedAt: {
          ...(query.completedFrom && { gte: new Date(query.completedFrom) }),
          ...(query.completedTo && { lt: new Date(query.completedTo) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  create(userId: string, dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
        tags: dto.tags ?? [],
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    await this.findOne(userId, id);

    return this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate !== undefined ? new Date(dto.dueDate) : undefined,
        // Keep completedAt consistent with status even when set via the general update endpoint,
        // not just PATCH /tasks/:id/complete — moving away from COMPLETED clears the timestamp.
        ...(dto.status === TaskStatus.COMPLETED && { completedAt: new Date() }),
        ...(dto.status &&
          dto.status !== TaskStatus.COMPLETED && { completedAt: null }),
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async complete(userId: string, id: string): Promise<Task> {
    await this.findOne(userId, id);
    return this.prisma.task.update({
      where: { id },
      data: { status: TaskStatus.COMPLETED, completedAt: new Date() },
    });
  }

  /** Lifetime completed-task count for this user, excluding soft-deleted tasks (same
   * `deletedAt: null` convention every other query in this service uses) — powers
   * StreaksService's XP calculation and the "Task Crusher" achievement (Milestone 8) without it
   * duplicating this service's own ownership-scoped Prisma query. */
  countCompleted(userId: string): Promise<number> {
    return this.prisma.task.count({
      where: { userId, status: TaskStatus.COMPLETED, deletedAt: null },
    });
  }
}
