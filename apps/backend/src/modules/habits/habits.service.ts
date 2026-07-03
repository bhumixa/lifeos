import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import {
  HabitFrequency,
  Prisma,
  type Habit,
  type HabitLog,
} from '../../../generated/prisma/index.js';
import type { CreateHabitDto } from './dto/create-habit.dto.js';
import type { CreateHabitLogDto } from './dto/create-habit-log.dto.js';
import type {
  HabitLogResponseDto,
  HabitResponseDto,
  HabitSummaryResponseDto,
} from './dto/habit-response.dto.js';
import type { HistoryQueryDto } from './dto/history-query.dto.js';
import type { ListHabitsQueryDto } from './dto/list-habits-query.dto.js';
import type { UpdateHabitDto } from './dto/update-habit.dto.js';
import type { UpdateHabitLogDto } from './dto/update-habit-log.dto.js';

interface PeriodWindow {
  /** Inclusive. */
  start: Date;
  /** Exclusive. */
  end: Date;
}

/**
 * Ownership follows the same pattern as TasksService/RoutinesService: every lookup is scoped by
 * `userId`, and a habit that exists but belongs to someone else is a 404, not a 403. HabitLog
 * rows have no owner column of their own — they're only ever reached through their parent
 * Habit, the same design RoutineStep uses for Routine.
 */
@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: ListHabitsQueryDto,
  ): Promise<PaginatedResult<HabitResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.HabitWhereInput = {
      userId,
      deletedAt: null,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.targetFrequency && { targetFrequency: query.targetFrequency }),
      ...(query.category && { category: query.category }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    // completionPercent isn't a database column — sorting by it means computing progress for
    // every matching row up front, unlike the other sort fields, which can page at the database.
    if (sortBy === 'completionPercent') {
      return this.findAllSortedByCompletion(where, sortOrder, page, pageSize);
    }

    const [habits, total] = await Promise.all([
      this.prisma.habit.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.habit.count({ where }),
    ]);

    return {
      data: await this.toResponses(habits),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<HabitResponseDto> {
    const habit = await this.findHabitOrThrow(userId, id);
    const [response] = await this.toResponses([habit]);
    return response;
  }

  async create(userId: string, dto: CreateHabitDto): Promise<HabitResponseDto> {
    await this.assertNameAvailable(userId, dto.name);
    if (dto.goalId) {
      await this.assertGoalOwnership(userId, dto.goalId);
    }

    const habit = await this.prisma.habit.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        targetFrequency: dto.targetFrequency ?? HabitFrequency.DAILY,
        targetCount: dto.targetCount ?? 1,
        category: dto.category,
        reminderTime: dto.reminderTime,
        isActive: dto.isActive ?? true,
        goalId: dto.goalId,
      },
    });
    const [response] = await this.toResponses([habit]);
    return response;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateHabitDto,
  ): Promise<HabitResponseDto> {
    await this.findHabitOrThrow(userId, id);
    if (dto.name) {
      await this.assertNameAvailable(userId, dto.name, id);
    }
    if (dto.goalId) {
      await this.assertGoalOwnership(userId, dto.goalId);
    }

    const habit = await this.prisma.habit.update({ where: { id }, data: dto });
    const [response] = await this.toResponses([habit]);
    return response;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findHabitOrThrow(userId, id);
    // Soft delete, per docs/06-database-design.md's design principles — Habit is named there
    // explicitly, same as Task.
    await this.prisma.habit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createLog(
    userId: string,
    habitId: string,
    dto: CreateHabitLogDto,
  ): Promise<HabitLogResponseDto> {
    await this.findHabitOrThrow(userId, habitId);
    const date = this.toDateOnly(dto.date);

    const existing = await this.prisma.habitLog.findUnique({
      where: { habitId_date: { habitId, date } },
    });
    if (existing) {
      throw new ConflictException(
        'A log already exists for this habit on this date — use PATCH to update it',
      );
    }

    const log = await this.prisma.habitLog.create({
      data: {
        habitId,
        date,
        completedCount: dto.completedCount ?? 1,
        notes: dto.notes,
      },
    });
    return this.toLogResponse(log);
  }

  async updateLog(
    userId: string,
    habitId: string,
    dto: UpdateHabitLogDto,
  ): Promise<HabitLogResponseDto> {
    await this.findHabitOrThrow(userId, habitId);
    const date = this.toDateOnly(dto.date);

    const existing = await this.prisma.habitLog.findUnique({
      where: { habitId_date: { habitId, date } },
    });
    if (!existing) {
      throw new NotFoundException('No log exists for this habit on this date');
    }

    const log = await this.prisma.habitLog.update({
      where: { id: existing.id },
      data: {
        ...(dto.completedCount !== undefined && {
          completedCount: dto.completedCount,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
    return this.toLogResponse(log);
  }

  async removeLog(
    userId: string,
    habitId: string,
    date?: string,
  ): Promise<void> {
    await this.findHabitOrThrow(userId, habitId);
    const targetDate = this.toDateOnly(date);

    const existing = await this.prisma.habitLog.findUnique({
      where: { habitId_date: { habitId, date: targetDate } },
    });
    if (!existing) {
      throw new NotFoundException('No log exists for this habit on this date');
    }

    await this.prisma.habitLog.delete({ where: { id: existing.id } });
  }

  /** Powers the Today's Habits page and the Dashboard's Quick Complete panel — every active
   * habit, each with its own current-period progress and whether it's been logged today. */
  async today(userId: string): Promise<HabitResponseDto[]> {
    const habits = await this.prisma.habit.findMany({
      where: { userId, deletedAt: null, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return this.toResponses(habits);
  }

  /** Powers the Dashboard's "Habits Completed Today" / "Total Active Habits" / "Completion
   * Percentage" cards. "Completed today" means at least one log with completedCount > 0 exists
   * for today, regardless of targetFrequency's longer period — a weekly habit still shows as
   * "done today" the day it's actually logged. */
  async summary(userId: string): Promise<HabitSummaryResponseDto> {
    const habits = await this.prisma.habit.findMany({
      where: { userId, deletedAt: null, isActive: true },
    });
    if (habits.length === 0) {
      return {
        habitsCompletedToday: 0,
        totalActiveHabits: 0,
        completionPercentage: 0,
      };
    }

    const today = this.toDateOnly();
    const logs = await this.prisma.habitLog.findMany({
      where: { habitId: { in: habits.map((habit) => habit.id) }, date: today },
    });
    const completedToday = logs.filter((log) => log.completedCount > 0).length;

    return {
      habitsCompletedToday: completedToday,
      totalActiveHabits: habits.length,
      completionPercentage: Math.round((completedToday / habits.length) * 100),
    };
  }

  /** Powers the Habit History page and the Habit Calendar Heatmap. Scoped to the requesting
   * user's own habits even when `habitId` is supplied — a habitId belonging to someone else
   * behaves as if it doesn't exist, same 404-not-403 rule as everywhere else. */
  async history(
    userId: string,
    query: HistoryQueryDto,
  ): Promise<PaginatedResult<HabitLogResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const ownedHabitIds = query.habitId
      ? [(await this.findHabitOrThrow(userId, query.habitId)).id]
      : (
          await this.prisma.habit.findMany({
            where: { userId },
            select: { id: true },
          })
        ).map((habit) => habit.id);

    const where: Prisma.HabitLogWhereInput = {
      habitId: { in: ownedHabitIds },
      ...((query.dateFrom ?? query.dateTo) && {
        date: {
          ...(query.dateFrom && { gte: this.toDateOnly(query.dateFrom) }),
          ...(query.dateTo && { lte: this.toDateOnly(query.dateTo) }),
        },
      }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.habitLog.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.habitLog.count({ where }),
    ]);

    return {
      data: logs.map((log) => this.toLogResponse(log)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private async findAllSortedByCompletion(
    where: Prisma.HabitWhereInput,
    sortOrder: 'asc' | 'desc',
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<HabitResponseDto>> {
    const habits = await this.prisma.habit.findMany({ where });
    const responses = await this.toResponses(habits);
    responses.sort((a, b) =>
      sortOrder === 'asc'
        ? a.completionPercent - b.completionPercent
        : b.completionPercent - a.completionPercent,
    );

    const total = responses.length;
    const start = (page - 1) * pageSize;
    return {
      data: responses.slice(start, start + pageSize),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /** Lifetime HabitLog count across every habit linked to a given Goal — powers GoalsService's
   * HABIT_COMPLETION progress calculation (Milestone 9) without it duplicating this service's own
   * ownership-scoped query, the same "reuse services" precedent TasksService.countCompleted
   * already set for Streaks. */
  countLogsByGoal(userId: string, goalId: string): Promise<number> {
    return this.prisma.habitLog.count({
      where: { habit: { userId, goalId, deletedAt: null } },
    });
  }

  private async findHabitOrThrow(userId: string, id: string): Promise<Habit> {
    const habit = await this.prisma.habit.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!habit) {
      throw new NotFoundException('Habit not found');
    }
    return habit;
  }

  /** Same rationale as TasksService's own assertGoalOwnership: a raw existence check rather than
   * injecting GoalsService, since GoalsModule already imports HabitsModule and importing back
   * would be circular. */
  private async assertGoalOwnership(
    userId: string,
    goalId: string,
  ): Promise<void> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
  }

  private async assertNameAvailable(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.habit.findFirst({
      where: {
        userId,
        name,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    if (existing) {
      throw new ConflictException('A habit with this name already exists');
    }
  }

  /** Every response needs its habit's current-period progress, computed from HabitLog rather
   * than stored (see the schema comment on Habit). Logs are fetched once for all the habits
   * being rendered, bounded to the start of the calendar month — which comfortably covers
   * DAILY/WEEKLY/MONTHLY periods — instead of one query per habit. */
  private async toResponses(habits: Habit[]): Promise<HabitResponseDto[]> {
    if (habits.length === 0) {
      return [];
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const today = this.toDateOnly(now);

    const logs = await this.prisma.habitLog.findMany({
      where: {
        habitId: { in: habits.map((habit) => habit.id) },
        date: { gte: monthStart },
      },
    });

    const logsByHabit = new Map<string, HabitLog[]>();
    for (const log of logs) {
      const bucket = logsByHabit.get(log.habitId) ?? [];
      bucket.push(log);
      logsByHabit.set(log.habitId, bucket);
    }

    return habits.map((habit) => {
      const habitLogs = logsByHabit.get(habit.id) ?? [];
      const window = this.currentPeriodWindow(habit.targetFrequency, now);
      const currentPeriodCount = habitLogs
        .filter((log) => log.date >= window.start && log.date < window.end)
        .reduce((sum, log) => sum + log.completedCount, 0);
      const todayCount =
        habitLogs.find((log) => log.date.getTime() === today.getTime())
          ?.completedCount ?? 0;

      return {
        id: habit.id,
        name: habit.name,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        targetFrequency: habit.targetFrequency,
        targetCount: habit.targetCount,
        category: habit.category,
        reminderTime: habit.reminderTime,
        isActive: habit.isActive,
        goalId: habit.goalId,
        currentPeriodCount,
        completionPercent: Math.min(
          100,
          Math.round((currentPeriodCount / habit.targetCount) * 100),
        ),
        todayCount,
        completedToday: todayCount > 0,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
      };
    });
  }

  private toLogResponse(log: HabitLog): HabitLogResponseDto {
    return {
      id: log.id,
      habitId: log.habitId,
      date: log.date,
      completedCount: log.completedCount,
      notes: log.notes,
      createdAt: log.createdAt,
    };
  }

  /** Boundaries of the period a habit's targetCount applies to, expressed in the same
   * UTC-midnight representation `toDateOnly` normalizes every HabitLog.date to. DAILY = today;
   * WEEKLY = Monday-start week; MONTHLY = calendar month. Uses the server's local calendar date
   * (via `toDateOnly`) rather than `User.timezone` — the same simplification Task/Routine already
   * make, since nothing in the app consumes per-user timezone yet. */
  private currentPeriodWindow(
    frequency: HabitFrequency,
    now: Date,
  ): PeriodWindow {
    const todayOnly = this.toDateOnly(now);

    if (frequency === HabitFrequency.MONTHLY) {
      const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
      return { start, end };
    }

    if (frequency === HabitFrequency.WEEKLY) {
      // getUTCDay(): 0=Sunday..6=Saturday; shift so Monday starts the week.
      const dayOffset = (todayOnly.getUTCDay() + 6) % 7;
      const start = new Date(todayOnly);
      start.setUTCDate(start.getUTCDate() - dayOffset);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      return { start, end };
    }

    const end = new Date(todayOnly);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: todayOnly, end };
  }

  /** Normalizes an optional "YYYY-MM-DD" (or full ISO) string, or a Date, to a UTC-midnight Date
   * matching how Prisma's `@db.Date` column stores/compares values — omitted defaults to today. */
  private toDateOnly(value?: string | Date): Date {
    const source = value ? new Date(value) : new Date();
    return new Date(
      Date.UTC(source.getFullYear(), source.getMonth(), source.getDate()),
    );
  }
}
