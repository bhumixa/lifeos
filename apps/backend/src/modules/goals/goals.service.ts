import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import {
  GoalStatus,
  GoalTargetType,
  PlannerBlockType,
  Prisma,
  type Goal,
  type GoalMilestone,
} from '../../../generated/prisma/index.js';
import { GoalCompletedEvent, NOTIFICATION_EVENTS } from '../../events/index.js';
import { TasksService } from '../tasks/tasks.service.js';
import { HabitsService } from '../habits/habits.service.js';
import { RoutinesService } from '../routines/routines.service.js';
import { PlannerService } from '../planner/planner.service.js';
import {
  formatDateOnly,
  parseDateOnly,
} from '../planner/utils/timezone.util.js';
import type { CreateGoalDto } from './dto/create-goal.dto.js';
import type { UpdateGoalDto } from './dto/update-goal.dto.js';
import type { ListGoalsQueryDto } from './dto/list-goals-query.dto.js';
import type { CreateGoalMilestoneDto } from './dto/create-goal-milestone.dto.js';
import type { UpdateGoalMilestoneDto } from './dto/update-goal-milestone.dto.js';
import type {
  GoalMilestoneResponseDto,
  GoalProgressResponseDto,
  GoalResponseDto,
} from './dto/goal-response.dto.js';
import {
  computeProgressPercent,
  computeRemainingValue,
  isProgressComplete,
} from './utils/goal-progress.util.js';

type GoalWithMilestones = Goal & { milestones: GoalMilestone[] };

/**
 * Ownership follows the same pattern as every other module: every lookup is scoped by `userId`,
 * and a goal (or milestone) that exists but belongs to someone else is a 404, not a 403.
 * GoalMilestone has no owner column of its own — like RoutineStep, it's only ever reached through
 * its parent Goal, ownership enforced by joining `goal: { userId }`.
 *
 * Progress aggregation reuses TasksService/HabitsService/RoutinesService/PlannerService rather
 * than querying their tables directly — the same "reuse services" rule StreaksService already
 * follows for Task/Planner totals (see docs/05-architecture.md). Unlike Streaks, `currentValue` is
 * a real, persisted column: GET /goals and GET /goals/:id return whatever's currently stored
 * (cheap — no source-table scan per goal in a list), and only GET /goals/:id/progress
 * (getProgress, below) actually recomputes it from source data for the four automatic target
 * types and writes the refreshed value back. CUSTOM goals have no automatic source at all —
 * `currentValue` only ever changes via PATCH /goals/:id, and getProgress just reads it back
 * unchanged. See the class doc on Goal in prisma/schema.prisma for the full rationale.
 *
 * `update` additionally emits a GoalCompletedEvent (Milestone 12) via the globally-registered
 * EventEmitter2 on the explicit transition into GoalStatus.COMPLETED — the same small, additive,
 * behavior-preserving side effect TasksService.complete/HabitsService.createLog already gained.
 */
@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly habitsService: HabitsService,
    private readonly routinesService: RoutinesService,
    private readonly plannerService: PlannerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    userId: string,
    query: ListGoalsQueryDto,
  ): Promise<PaginatedResult<GoalResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.GoalWhereInput = {
      userId,
      deletedAt: null,
      archived: query.archived ?? false,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.category && { category: query.category }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' },
      }),
    };

    // progressPercent isn't a database column — sorting by it means computing it for every
    // matching row up front, the same trade-off HabitsService.findAllSortedByCompletion makes.
    if (sortBy === 'progressPercent') {
      return this.findAllSortedByProgress(where, sortOrder, page, pageSize);
    }

    const [goals, total] = await Promise.all([
      this.prisma.goal.findMany({
        where,
        include: { milestones: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.goal.count({ where }),
    ]);

    return {
      data: goals.map((goal) => this.toResponse(goal)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<GoalResponseDto> {
    const goal = await this.findGoalOrThrow(userId, id);
    return this.toResponse(goal);
  }

  async create(userId: string, dto: CreateGoalDto): Promise<GoalResponseDto> {
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        category: dto.category,
        priority: dto.priority,
        status: dto.status,
        targetType: dto.targetType,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue ?? 0,
        startDate: dto.startDate ? parseDateOnly(dto.startDate) : undefined,
        targetDate: dto.targetDate ? parseDateOnly(dto.targetDate) : undefined,
      },
      include: { milestones: true },
    });
    return this.toResponse(goal);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    const existing = await this.findGoalOrThrow(userId, id);
    const resolvedTargetType = dto.targetType ?? existing.targetType;
    // A client-supplied currentValue only ever applies to CUSTOM goals — automatic target types
    // are exclusively refreshed by getProgress, so a stray currentValue in the request body for
    // those is silently ignored rather than allowed to drift the stored value out of sync with
    // what getProgress would recompute (see the class doc above).
    const currentValue =
      dto.currentValue !== undefined &&
      resolvedTargetType === GoalTargetType.CUSTOM
        ? dto.currentValue
        : undefined;

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        category: dto.category,
        priority: dto.priority,
        status: dto.status,
        targetType: dto.targetType,
        targetValue: dto.targetValue,
        ...(currentValue !== undefined && { currentValue }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? parseDateOnly(dto.startDate) : null,
        }),
        ...(dto.targetDate !== undefined && {
          targetDate: dto.targetDate ? parseDateOnly(dto.targetDate) : null,
        }),
      },
      include: { milestones: true },
    });

    // Emits only on the explicit NOT_STARTED/ACTIVE/PAUSED/CANCELLED -> COMPLETED transition —
    // Goal status is PATCH-driven, not auto-derived from currentValue (see the class doc on this
    // service), so this is the one clear "a goal just finished" moment (Milestone 12).
    if (
      dto.status === GoalStatus.COMPLETED &&
      existing.status !== GoalStatus.COMPLETED
    ) {
      this.eventEmitter.emit(
        NOTIFICATION_EVENTS.GOAL_COMPLETED,
        new GoalCompletedEvent(userId, goal.id, goal.title),
      );
    }

    return this.toResponse(goal);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findGoalOrThrow(userId, id);
    // Soft delete, per docs/06-database-design.md's design principles — Goal is named there
    // explicitly, same as Task/Habit.
    await this.prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async archive(userId: string, id: string): Promise<GoalResponseDto> {
    await this.findGoalOrThrow(userId, id);
    const goal = await this.prisma.goal.update({
      where: { id },
      data: { archived: true },
      include: { milestones: true },
    });
    return this.toResponse(goal);
  }

  async unarchive(userId: string, id: string): Promise<GoalResponseDto> {
    await this.findGoalOrThrow(userId, id);
    const goal = await this.prisma.goal.update({
      where: { id },
      data: { archived: false },
      include: { milestones: true },
    });
    return this.toResponse(goal);
  }

  /** The one endpoint that actually walks source data for the four automatic target types and
   * persists the refreshed `currentValue` — see the class doc above for why this, and not GET
   * /goals or GET /goals/:id, is where that recompute happens. CUSTOM goals have nothing to
   * recompute; this just reflects whatever was last set via PATCH. */
  async getProgress(
    userId: string,
    id: string,
  ): Promise<GoalProgressResponseDto> {
    const goal = await this.findGoalOrThrow(userId, id);
    const currentValue =
      goal.targetType === GoalTargetType.CUSTOM
        ? goal.currentValue
        : await this.computeCurrentValue(userId, goal);

    if (currentValue !== goal.currentValue) {
      await this.prisma.goal.update({
        where: { id },
        data: { currentValue },
      });
    }

    return {
      goalId: goal.id,
      targetType: goal.targetType,
      targetValue: goal.targetValue,
      currentValue,
      progressPercent: computeProgressPercent(currentValue, goal.targetValue),
      remainingValue: computeRemainingValue(currentValue, goal.targetValue),
      isComplete: isProgressComplete(currentValue, goal.targetValue),
    };
  }

  async addMilestone(
    userId: string,
    goalId: string,
    dto: CreateGoalMilestoneDto,
  ): Promise<GoalMilestoneResponseDto> {
    await this.findGoalOrThrow(userId, goalId);
    const order = dto.order ?? (await this.nextMilestoneOrder(goalId));

    const milestone = await this.prisma.goalMilestone.create({
      data: {
        goalId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? parseDateOnly(dto.dueDate) : undefined,
        order,
      },
    });
    return this.toMilestoneResponse(milestone);
  }

  async updateMilestone(
    userId: string,
    milestoneId: string,
    dto: UpdateGoalMilestoneDto,
  ): Promise<GoalMilestoneResponseDto> {
    const existing = await this.findMilestoneOrThrow(userId, milestoneId);

    const milestone = await this.prisma.goalMilestone.update({
      where: { id: milestoneId },
      data: {
        title: dto.title,
        description: dto.description,
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? parseDateOnly(dto.dueDate) : null,
        }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.completed !== undefined && {
          completed: dto.completed,
          completedAt: dto.completed
            ? (existing.completedAt ?? new Date())
            : null,
        }),
      },
    });
    return this.toMilestoneResponse(milestone);
  }

  async removeMilestone(userId: string, milestoneId: string): Promise<void> {
    await this.findMilestoneOrThrow(userId, milestoneId);
    // Hard delete, like RoutineStep — a milestone is disposable checkpoint content, not named in
    // docs/06-database-design.md's soft-delete list.
    await this.prisma.goalMilestone.delete({ where: { id: milestoneId } });
  }

  /** Recomputes `currentValue` for the three target types with an automatic source, per the
   * 1:1 mapping the milestone brief's business rules establish (Tasks/Habits/Routine/Planner ->
   * TASK_COUNT/HABIT_COMPLETION/ROUTINE_COMPLETION/FOCUS_TIME) — see the class doc on Goal in
   * prisma/schema.prisma. Each branch calls another module's own exported, ownership-scoped
   * method rather than querying that module's tables directly. */
  private async computeCurrentValue(
    userId: string,
    goal: Goal,
  ): Promise<number> {
    switch (goal.targetType) {
      case GoalTargetType.TASK_COUNT:
        return this.tasksService.countCompletedByGoal(userId, goal.id);
      case GoalTargetType.HABIT_COMPLETION:
        return this.habitsService.countLogsByGoal(userId, goal.id);
      case GoalTargetType.ROUTINE_COMPLETION: {
        const stepIds = await this.routinesService.getStepIdsByGoal(
          userId,
          goal.id,
        );
        return this.plannerService.countCompletedBlocksByReferenceIds(
          userId,
          stepIds,
          PlannerBlockType.ROUTINE,
        );
      }
      case GoalTargetType.FOCUS_TIME:
        return this.plannerService.sumCompletedDurationByGoal(userId, goal.id);
      case GoalTargetType.CUSTOM:
        return goal.currentValue;
    }
  }

  private async findAllSortedByProgress(
    where: Prisma.GoalWhereInput,
    sortOrder: 'asc' | 'desc',
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<GoalResponseDto>> {
    const goals = await this.prisma.goal.findMany({
      where,
      include: { milestones: true },
    });
    const responses = goals.map((goal) => this.toResponse(goal));
    responses.sort((a, b) =>
      sortOrder === 'asc'
        ? a.progressPercent - b.progressPercent
        : b.progressPercent - a.progressPercent,
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

  private async findGoalOrThrow(
    userId: string,
    id: string,
  ): Promise<GoalWithMilestones> {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
      include: { milestones: true },
    });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    return goal;
  }

  private async findMilestoneOrThrow(
    userId: string,
    milestoneId: string,
  ): Promise<GoalMilestone> {
    const milestone = await this.prisma.goalMilestone.findFirst({
      where: { id: milestoneId, goal: { userId, deletedAt: null } },
    });
    if (!milestone) {
      throw new NotFoundException('Goal milestone not found');
    }
    return milestone;
  }

  private async nextMilestoneOrder(goalId: string): Promise<number> {
    const last = await this.prisma.goalMilestone.findFirst({
      where: { goalId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

  private toResponse(goal: GoalWithMilestones): GoalResponseDto {
    const milestones = [...goal.milestones].sort((a, b) => a.order - b.order);
    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      icon: goal.icon,
      color: goal.color,
      category: goal.category,
      priority: goal.priority,
      targetType: goal.targetType,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      progressPercent: computeProgressPercent(
        goal.currentValue,
        goal.targetValue,
      ),
      startDate: goal.startDate ? formatDateOnly(goal.startDate) : null,
      targetDate: goal.targetDate ? formatDateOnly(goal.targetDate) : null,
      status: goal.status,
      archived: goal.archived,
      milestones: milestones.map((milestone) =>
        this.toMilestoneResponse(milestone),
      ),
      milestonesCompletedCount: milestones.filter((m) => m.completed).length,
      milestonesTotalCount: milestones.length,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  private toMilestoneResponse(
    milestone: GoalMilestone,
  ): GoalMilestoneResponseDto {
    return {
      id: milestone.id,
      goalId: milestone.goalId,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate ? formatDateOnly(milestone.dueDate) : null,
      completed: milestone.completed,
      completedAt: milestone.completedAt,
      order: milestone.order,
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
    };
  }
}
