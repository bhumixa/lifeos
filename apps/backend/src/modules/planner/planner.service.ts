import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  PlannerBlockType,
  TaskStatus,
  type PlannerBlock,
  type PlannerDay,
} from '../../../generated/prisma/index.js';
import { TasksService } from '../tasks/tasks.service.js';
import { RoutinesService } from '../routines/routines.service.js';
import { HabitsService } from '../habits/habits.service.js';
import type { CreatePlannerBlockDto } from './dto/create-planner-block.dto.js';
import type { UpdatePlannerBlockDto } from './dto/update-planner-block.dto.js';
import type { ReorderPlannerBlocksDto } from './dto/reorder-planner-blocks.dto.js';
import type { CompletePlannerBlockDto } from './dto/complete-planner-block.dto.js';
import type { GeneratePlannerDto } from './dto/generate-planner.dto.js';
import type {
  GeneratePlannerResponseDto,
  PlannerDayResponseDto,
} from './dto/planner-day-response.dto.js';
import {
  addDaysToDateString,
  addMinutes,
  diffMinutes,
  formatDateOnly,
  getZonedDateString,
  parseDateOnly,
  zonedWallTimeToUtc,
} from './utils/timezone.util.js';
import {
  findFreeSlot,
  hasOverlap,
  type Interval,
} from './utils/scheduler.util.js';

type PlannerDayWithBlocks = PlannerDay & { blocks: PlannerBlock[] };

const DEFAULT_BUFFER_MINUTES = 10;
// A user's actual wake/sleep time isn't available yet — docs/06-database-design.md's
// UserSettings.wakeTime/sleepTime was deferred back in Milestone 2 and still doesn't exist (see
// docs/03-assumptions.md's precedent for documenting placeholder limits like this one). Generation
// confines itself to a fixed daytime window until that field exists to read instead.
const DAY_WINDOW_START = '07:00';
const DAY_WINDOW_END = '22:00';
const DEFAULT_TASK_DURATION_MINUTES = 30;
const DEFAULT_HABIT_DURATION_MINUTES = 15;
const PRIORITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

// Types the generator owns end-to-end: every regenerate deletes and rebuilds exactly these, and
// never touches FOCUS/BREAK/CUSTOM, which only a user creates. See the class doc on `generate`.
const GENERATED_TYPES: PlannerBlockType[] = [
  PlannerBlockType.TASK,
  PlannerBlockType.ROUTINE,
  PlannerBlockType.HABIT,
];

interface DraftBlock {
  type: PlannerBlockType;
  referenceId: string | null;
  title: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Ownership follows the same pattern as Tasks/Routines/Habits: every lookup is scoped by
 * `userId`, and a day or block that exists but belongs to someone else is a 404, not a 403.
 * PlannerBlock has no userId column of its own (like RoutineStep) — it's only ever reached
 * through its parent PlannerDay, so every block lookup joins through `plannerDay: { userId }`.
 *
 * Reuses TasksService/RoutinesService/HabitsService directly rather than querying Prisma for
 * Task/Routine/Habit rows itself — those services already own ownership-scoping and
 * response-shaping for their resources (see docs/05-architecture.md's "reuse services" rule);
 * duplicating that logic here would be exactly the kind of drift CLAUDE.md's "never duplicate
 * logic" rule warns about.
 */
@Injectable()
export class PlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly routinesService: RoutinesService,
    private readonly habitsService: HabitsService,
  ) {}

  async today(userId: string): Promise<PlannerDayResponseDto> {
    const timezone = await this.getTimezone(userId);
    return this.getByDate(userId, getZonedDateString(new Date(), timezone));
  }

  async getByDate(
    userId: string,
    date: string,
  ): Promise<PlannerDayResponseDto> {
    const day = await this.findOrCreateDay(userId, date);
    return this.toDayResponse(day);
  }

  async createBlock(
    userId: string,
    dto: CreatePlannerBlockDto,
  ): Promise<PlannerDayResponseDto> {
    const timezone = await this.getTimezone(userId);
    const date = dto.date ?? getZonedDateString(new Date(), timezone);
    const day = await this.findOrCreateDay(userId, date);
    if (dto.goalId) {
      await this.assertGoalOwnership(userId, dto.goalId);
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.assertValidRange(startTime, endTime);

    await this.prisma.plannerBlock.create({
      data: {
        plannerDayId: day.id,
        type: dto.type,
        referenceId: dto.referenceId,
        title: dto.title,
        description: dto.description,
        startTime,
        endTime,
        duration: diffMinutes(startTime, endTime),
        color: dto.color,
        order: dto.order ?? (await this.nextOrder(day.id)),
        goalId: dto.goalId,
      },
    });

    return this.getByDate(userId, date);
  }

  async updateBlock(
    userId: string,
    blockId: string,
    dto: UpdatePlannerBlockDto,
  ): Promise<PlannerDayResponseDto> {
    const block = await this.findBlockOrThrow(userId, blockId);
    if (dto.goalId) {
      await this.assertGoalOwnership(userId, dto.goalId);
    }

    const startTime = dto.startTime ? new Date(dto.startTime) : block.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : block.endTime;
    if (dto.startTime ?? dto.endTime) {
      this.assertValidRange(startTime, endTime);
    }

    await this.prisma.plannerBlock.update({
      where: { id: blockId },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.referenceId !== undefined && { referenceId: dto.referenceId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.goalId !== undefined && { goalId: dto.goalId }),
        ...((dto.startTime ?? dto.endTime) && {
          startTime,
          endTime,
          duration: diffMinutes(startTime, endTime),
        }),
      },
    });

    return this.getByDate(
      block.plannerDay.userId,
      formatDateOnly(block.plannerDay.date),
    );
  }

  async removeBlock(userId: string, blockId: string): Promise<void> {
    await this.findBlockOrThrow(userId, blockId);
    // Hard delete, like RoutineStep — a planner block is disposable scheduling, not the
    // irreplaceable content docs/06-database-design.md's soft-delete principle protects.
    await this.prisma.plannerBlock.delete({ where: { id: blockId } });
  }

  async reorder(
    userId: string,
    dto: ReorderPlannerBlocksDto,
  ): Promise<PlannerDayResponseDto> {
    const day = await this.findOrCreateDay(userId, dto.date);
    const existingIds = new Set(day.blocks.map((block) => block.id));

    if (
      dto.blockIds.length !== existingIds.size ||
      !dto.blockIds.every((id) => existingIds.has(id))
    ) {
      throw new BadRequestException(
        "blockIds must be exactly that date's current block IDs",
      );
    }

    await this.prisma.$transaction(
      dto.blockIds.map((id, index) =>
        this.prisma.plannerBlock.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.getByDate(userId, dto.date);
  }

  /** Toggles a block's own `completed` flag — nothing else. Per the milestone's business rule
   * ("Planner should never modify Tasks or Habits automatically"), this never writes to the Task
   * or Habit a TASK/HABIT block references; a user who wants that underlying Task/Habit marked
   * done does so from that feature directly. */
  async complete(
    userId: string,
    dto: CompletePlannerBlockDto,
  ): Promise<PlannerDayResponseDto> {
    const block = await this.findBlockOrThrow(userId, dto.blockId);
    await this.prisma.plannerBlock.update({
      where: { id: dto.blockId },
      data: { completed: dto.completed ?? true },
    });
    return this.getByDate(
      block.plannerDay.userId,
      formatDateOnly(block.plannerDay.date),
    );
  }

  /**
   * Deterministic regeneration — no AI, no randomness. Idempotent by construction: TASK/ROUTINE/
   * HABIT blocks (the ones this method itself creates) are deleted and rebuilt from current
   * Task/Routine/Habit state on every call; FOCUS/BREAK/CUSTOM blocks are always user-authored,
   * so generation treats them as fixed obstacles and never deletes, moves, or overlaps them.
   *
   * Placement order — routines, then tasks, then habits — is what "respect routine order" means
   * here: routine steps keep their own fixed anchor times unconditionally (skipped only if they'd
   * collide with a user's own fixed block), and tasks/habits fill the remaining gaps around them,
   * never the other way around. Every block's final `order` is reassigned by chronological
   * startTime across the whole day (fixed blocks included), so the day reads top-to-bottom
   * correctly immediately after generating.
   */
  async generate(
    userId: string,
    dto: GeneratePlannerDto,
  ): Promise<GeneratePlannerResponseDto> {
    const timezone = await this.getTimezone(userId);
    const date = dto.date ?? getZonedDateString(new Date(), timezone);
    const bufferMinutes = dto.bufferMinutes ?? DEFAULT_BUFFER_MINUTES;

    const windowStart = zonedWallTimeToUtc(date, DAY_WINDOW_START, timezone);
    const windowEnd = zonedWallTimeToUtc(date, DAY_WINDOW_END, timezone);

    const day = await this.findOrCreateDay(userId, date);
    const fixedBlocks = day.blocks.filter(
      (block) => !GENERATED_TYPES.includes(block.type),
    );
    const occupied: Interval[] = fixedBlocks.map((block) => ({
      start: block.startTime,
      end: block.endTime,
    }));

    const draft: DraftBlock[] = [];

    // --- Routines: fixed anchor times, placed first, never moved to make room for anything else.
    const routines = await this.routinesService.findAll(userId, true);
    const steps = routines
      .flatMap((routine) => routine.steps)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (const step of steps) {
      const start = zonedWallTimeToUtc(date, step.startTime, timezone);
      const end = addMinutes(start, step.durationMinutes);
      const candidate: Interval = { start, end };
      if (hasOverlap(candidate, occupied)) {
        continue;
      }
      draft.push({
        type: PlannerBlockType.ROUTINE,
        referenceId: step.id,
        title: step.title,
        startTime: candidate.start,
        endTime: candidate.end,
      });
      occupied.push(candidate);
    }

    // --- Tasks due today: highest priority first, greedily filling the earliest gap that fits.
    const dayStartIso = zonedWallTimeToUtc(
      date,
      '00:00',
      timezone,
    ).toISOString();
    const dayEndIso = zonedWallTimeToUtc(
      addDaysToDateString(date, 1),
      '00:00',
      timezone,
    ).toISOString();
    const { data: dueTasks } = await this.tasksService.findAll(userId, {
      dueFrom: dayStartIso,
      dueTo: dayEndIso,
      pageSize: 100,
    });
    const openTasks = dueTasks
      .filter(
        (task) =>
          task.status === TaskStatus.TODO ||
          task.status === TaskStatus.IN_PROGRESS,
      )
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

    const unscheduledTaskIds: string[] = [];
    for (const task of openTasks) {
      const duration = task.estimatedMinutes ?? DEFAULT_TASK_DURATION_MINUTES;
      const slot = findFreeSlot(
        occupied,
        duration,
        bufferMinutes,
        windowStart,
        windowEnd,
      );
      if (!slot) {
        unscheduledTaskIds.push(task.id);
        continue;
      }
      draft.push({
        type: PlannerBlockType.TASK,
        referenceId: task.id,
        title: task.title,
        startTime: slot.start,
        endTime: slot.end,
      });
      occupied.push(slot);
    }

    // --- Habits not yet completed today: same greedy fill, fixed default duration.
    const habits = await this.habitsService.today(userId);
    const openHabits = habits.filter((habit) => !habit.completedToday);

    const unscheduledHabitIds: string[] = [];
    for (const habit of openHabits) {
      const slot = findFreeSlot(
        occupied,
        DEFAULT_HABIT_DURATION_MINUTES,
        bufferMinutes,
        windowStart,
        windowEnd,
      );
      if (!slot) {
        unscheduledHabitIds.push(habit.id);
        continue;
      }
      draft.push({
        type: PlannerBlockType.HABIT,
        referenceId: habit.id,
        title: habit.name,
        startTime: slot.start,
        endTime: slot.end,
      });
      occupied.push(slot);
    }

    await this.replaceGeneratedBlocks(day, fixedBlocks, draft);

    const response = await this.getByDate(userId, date);
    return { ...response, unscheduledTaskIds, unscheduledHabitIds };
  }

  private async replaceGeneratedBlocks(
    day: PlannerDayWithBlocks,
    fixedBlocks: PlannerBlock[],
    draft: DraftBlock[],
  ): Promise<void> {
    const toReplaceIds = day.blocks
      .filter((block) => GENERATED_TYPES.includes(block.type))
      .map((block) => block.id);

    type MergedEntry =
      | { kind: 'fixed'; id: string; startTime: Date }
      | { kind: 'new'; startTime: Date; block: DraftBlock };

    const merged: MergedEntry[] = [
      ...fixedBlocks.map((block) => ({
        kind: 'fixed' as const,
        id: block.id,
        startTime: block.startTime,
      })),
      ...draft.map((block) => ({
        kind: 'new' as const,
        startTime: block.startTime,
        block,
      })),
    ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    await this.prisma.$transaction([
      this.prisma.plannerBlock.deleteMany({
        where: { id: { in: toReplaceIds } },
      }),
      ...merged.map((entry, order) =>
        entry.kind === 'fixed'
          ? this.prisma.plannerBlock.update({
              where: { id: entry.id },
              data: { order },
            })
          : this.prisma.plannerBlock.create({
              data: {
                plannerDayId: day.id,
                type: entry.block.type,
                referenceId: entry.block.referenceId,
                title: entry.block.title,
                startTime: entry.block.startTime,
                endTime: entry.block.endTime,
                duration: diffMinutes(
                  entry.block.startTime,
                  entry.block.endTime,
                ),
                order,
              },
            }),
      ),
    ]);
  }

  /** Lifetime count of completed PlannerBlocks for this user, optionally narrowed to one
   * `type` — powers StreaksService's XP calculation ("Routine Completed") and the "Planner
   * Master" achievement (Milestone 8). Counts whatever blocks currently exist; PlannerBlock has
   * no soft delete, and `generate()` deletes and rebuilds every TASK/ROUTINE/HABIT block on each
   * call (see the class doc on `generate`), so a regenerated day's prior completions are no
   * longer counted after that day is regenerated — a known limitation of building this on top of
   * Planner's existing schema rather than a new persistent completion-event ledger, not something
   * this milestone works around by changing Planner's own (already-approved) regeneration
   * behavior. */
  countCompletedBlocks(
    userId: string,
    type?: PlannerBlockType,
  ): Promise<number> {
    return this.prisma.plannerBlock.count({
      where: {
        completed: true,
        plannerDay: { userId },
        ...(type && { type }),
      },
    });
  }

  /** Count of completed PlannerBlocks of a given `type` whose `referenceId` is one of the given
   * ids — powers GoalsService's ROUTINE_COMPLETION progress calculation (Milestone 9), which
   * first asks RoutinesService.getStepIdsByGoal for "which RoutineStep ids belong to this goal's
   * routines" and passes them straight through here, since PlannerBlock (not RoutineStep) is
   * where a routine step's completion is actually recorded — see the comment on Routine in
   * prisma/schema.prisma. Returns 0 without querying when `referenceIds` is empty, since an
   * empty Prisma `in: []` would otherwise scan for a condition that can never match. */
  countCompletedBlocksByReferenceIds(
    userId: string,
    referenceIds: string[],
    type: PlannerBlockType,
  ): Promise<number> {
    if (referenceIds.length === 0) {
      return Promise.resolve(0);
    }
    return this.prisma.plannerBlock.count({
      where: {
        completed: true,
        type,
        referenceId: { in: referenceIds },
        plannerDay: { userId },
      },
    });
  }

  /** Sum of `duration` (minutes) across this user's completed PlannerBlocks directly linked to a
   * given Goal (via PlannerBlock.goalId, independent of `type`/`referenceId`) — powers
   * GoalsService's FOCUS_TIME progress calculation (Milestone 9). */
  async sumCompletedDurationByGoal(
    userId: string,
    goalId: string,
  ): Promise<number> {
    const result = await this.prisma.plannerBlock.aggregate({
      where: { completed: true, goalId, plannerDay: { userId } },
      _sum: { duration: true },
    });
    return result._sum.duration ?? 0;
  }

  /** Same rationale as TasksService's own assertGoalOwnership: a raw existence check rather than
   * injecting GoalsService, since GoalsModule already imports PlannerModule and importing back
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

  private async getTimezone(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    // Only unreachable if the JWT outlives the user row it was issued for (e.g. account deleted
    // mid-session) — JwtAuthGuard already guarantees the id is a real, currently valid user.
    return user?.timezone ?? 'UTC';
  }

  private async findOrCreateDay(
    userId: string,
    date: string,
  ): Promise<PlannerDayWithBlocks> {
    const parsedDate = parseDateOnly(date);
    const existing = await this.prisma.plannerDay.findUnique({
      where: { userId_date: { userId, date: parsedDate } },
      include: { blocks: { orderBy: { order: 'asc' } } },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.plannerDay.create({
      data: { userId, date: parsedDate },
      include: { blocks: true },
    });
  }

  private async findBlockOrThrow(
    userId: string,
    blockId: string,
  ): Promise<PlannerBlock & { plannerDay: PlannerDay }> {
    const block = await this.prisma.plannerBlock.findFirst({
      where: { id: blockId, plannerDay: { userId } },
      include: { plannerDay: true },
    });
    if (!block) {
      throw new NotFoundException('Planner block not found');
    }
    return block;
  }

  private async nextOrder(plannerDayId: string): Promise<number> {
    const last = await this.prisma.plannerBlock.findFirst({
      where: { plannerDayId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

  private assertValidRange(startTime: Date, endTime: Date): void {
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  private toDayResponse(day: PlannerDayWithBlocks): PlannerDayResponseDto {
    return {
      id: day.id,
      date: formatDateOnly(day.date),
      notes: day.notes,
      blocks: [...day.blocks].sort((a, b) => a.order - b.order),
      createdAt: day.createdAt,
      updatedAt: day.updatedAt,
    };
  }
}
