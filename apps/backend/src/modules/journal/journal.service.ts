import {
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import {
  JournalType,
  Prisma,
  type JournalAttachment,
  type JournalEntry,
} from '../../../generated/prisma/index.js';
import {
  JournalCreatedEvent,
  NOTIFICATION_EVENTS,
} from '../../events/index.js';
import {
  formatDateOnly,
  getZonedDateString,
  parseDateOnly,
} from '../planner/utils/timezone.util.js';
import type { CreateJournalAttachmentDto } from './dto/create-journal-attachment.dto.js';
import type { CreateJournalEntryDto } from './dto/create-journal-entry.dto.js';
import type { JournalHistoryQueryDto } from './dto/journal-history-query.dto.js';
import type {
  JournalAttachmentResponseDto,
  JournalDayResponseDto,
  JournalEntryResponseDto,
  JournalPromptResponseDto,
} from './dto/journal-response.dto.js';
import type { ListJournalQueryDto } from './dto/list-journal-query.dto.js';
import type { SearchJournalQueryDto } from './dto/search-journal-query.dto.js';
import type { UpdateJournalEntryDto } from './dto/update-journal-entry.dto.js';
import { JOURNAL_PROMPT_DEFINITIONS } from './utils/journal-prompt-definitions.js';

type JournalEntryWithAttachments = JournalEntry & {
  attachments: JournalAttachment[];
};

const ENTRY_TYPES_LIMITED_TO_ONE_PER_DAY: JournalType[] = [
  JournalType.MORNING,
  JournalType.EVENING,
];

/**
 * Ownership follows the same pattern as every other module: every lookup is scoped by `userId`,
 * and an entry (or attachment) that exists but belongs to someone else is a 404, not a 403.
 * JournalAttachment has no owner column of its own — like RoutineStep/GoalMilestone, it's only
 * ever reached through its parent JournalEntry, ownership enforced by joining `journal: { userId }`.
 *
 * "Today" is resolved per-user-timezone, reusing planner/utils/timezone.util.ts directly (a plain
 * file import, not through PlannerService — these are pure functions with no DI/state needs, the
 * same reuse-across-module-boundaries precedent Streaks already set for the same file). A
 * Journal "day" is exactly the kind of day-boundary concept docs/05-architecture.md warns a naive
 * UTC cutoff mis-schedules for non-UTC users, so it gets the same treatment Planner/Streaks give
 * it rather than the server-local shortcut Habit/Routine took before per-user timezone use existed
 * in this codebase at all.
 *
 * `JournalService` is exported by `JournalModule` (see its class doc) purely so a future AI Coach
 * module can inject it and read a user's journal history as coaching context — this milestone adds
 * no AI code, only that seam, matching how Tasks/Routines/Habits/Planner already export their own
 * services for reuse by later milestones.
 */
@Injectable()
export class JournalService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Upserts the prompt catalog from JOURNAL_PROMPT_DEFINITIONS — idempotent, so restarting the
   * app (or re-running this on every boot) is always safe. Mirrors
   * AchievementsService.onModuleInit exactly. */
  async onModuleInit(): Promise<void> {
    for (const definition of JOURNAL_PROMPT_DEFINITIONS) {
      await this.prisma.journalPrompt.upsert({
        where: { code: definition.code },
        update: {
          type: definition.type,
          question: definition.question,
          placeholder: definition.placeholder,
          order: definition.order,
        },
        create: {
          code: definition.code,
          type: definition.type,
          question: definition.question,
          placeholder: definition.placeholder,
          order: definition.order,
        },
      });
    }
  }

  async findAll(
    userId: string,
    query: ListJournalQueryDto,
  ): Promise<PaginatedResult<JournalEntryResponseDto>> {
    const where: Prisma.JournalEntryWhereInput = {
      userId,
      deletedAt: null,
      ...(query.type && { type: query.type }),
    };
    return this.paginate(
      where,
      { [query.sortBy ?? 'date']: query.sortOrder ?? 'desc' },
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  /** Powers Journal History — the same "paginated timeline, optionally bounded by a date range"
   * shape as HabitsService.history. */
  async history(
    userId: string,
    query: JournalHistoryQueryDto,
  ): Promise<PaginatedResult<JournalEntryResponseDto>> {
    const where: Prisma.JournalEntryWhereInput = {
      userId,
      deletedAt: null,
      ...(query.type && { type: query.type }),
      ...((query.dateFrom ?? query.dateTo) && {
        date: {
          ...(query.dateFrom && { gte: parseDateOnly(query.dateFrom) }),
          ...(query.dateTo && { lte: parseDateOnly(query.dateTo) }),
        },
      }),
    };
    return this.paginate(
      where,
      { date: 'desc' },
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  /** The rich filter endpoint (date range, mood, energy, tag, goal, type, keyword) — see
   * SearchJournalQueryDto. Also what Goal Detail's "related journal entries" panel calls
   * (`?goalId=`), and what the Search Journals page drives directly. */
  async search(
    userId: string,
    query: SearchJournalQueryDto,
  ): Promise<PaginatedResult<JournalEntryResponseDto>> {
    const where: Prisma.JournalEntryWhereInput = {
      userId,
      deletedAt: null,
      ...(query.type && { type: query.type }),
      ...(query.mood && { mood: query.mood }),
      ...(query.energy && { energy: query.energy }),
      ...(query.goalId && { goalId: query.goalId }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...((query.dateFrom ?? query.dateTo) && {
        date: {
          ...(query.dateFrom && { gte: parseDateOnly(query.dateFrom) }),
          ...(query.dateTo && { lte: parseDateOnly(query.dateTo) }),
        },
      }),
      ...(query.keyword && {
        OR: [
          { title: { contains: query.keyword, mode: 'insensitive' } },
          { content: { contains: query.keyword, mode: 'insensitive' } },
        ],
      }),
    };
    return this.paginate(
      where,
      { [query.sortBy ?? 'date']: query.sortOrder ?? 'desc' },
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  /** Every entry for one calendar date (0-2 MORNING/EVENING plus any number of FREEFORM) — the
   * same "whole day, not one row" shape PlannerService.getByDate already returns. Unlike Planner,
   * this never auto-creates anything (there's no day container to provision; an empty `entries`
   * array is a perfectly valid response for a date with no journaling yet). */
  async getByDate(
    userId: string,
    dateStr: string,
  ): Promise<JournalDayResponseDto> {
    const date = parseDateOnly(dateStr);
    const entries = await this.prisma.journalEntry.findMany({
      where: { userId, date, deletedAt: null },
      include: { attachments: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      date: dateStr,
      entries: entries.map((entry) => this.toResponse(entry)),
    };
  }

  async getPrompts(type?: JournalType): Promise<JournalPromptResponseDto[]> {
    const prompts = await this.prisma.journalPrompt.findMany({
      where: { active: true, ...(type && { type }) },
      orderBy: { order: 'asc' },
    });
    return prompts.map((prompt) => ({
      id: prompt.id,
      code: prompt.code,
      type: prompt.type,
      question: prompt.question,
      placeholder: prompt.placeholder,
      order: prompt.order,
      active: prompt.active,
    }));
  }

  async create(
    userId: string,
    dto: CreateJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    const dateStr = dto.date ?? (await this.todayForUser(userId));
    const date = parseDateOnly(dateStr);

    if (ENTRY_TYPES_LIMITED_TO_ONE_PER_DAY.includes(dto.type)) {
      const existing = await this.prisma.journalEntry.findFirst({
        where: { userId, date, type: dto.type, deletedAt: null },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          `A ${dto.type} journal entry already exists for ${dateStr} — use PATCH to update it`,
        );
      }
    }

    if (dto.goalId) {
      await this.assertGoalOwnership(userId, dto.goalId);
    }
    if (dto.plannerDayId) {
      await this.assertPlannerDayOwnership(userId, dto.plannerDayId);
    }

    const entry = await this.prisma.journalEntry.create({
      data: {
        userId,
        date,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        mood: dto.mood,
        energy: dto.energy,
        productivity: dto.productivity,
        gratitude: dto.gratitude ?? [],
        wins: dto.wins ?? [],
        lessons: dto.lessons,
        tomorrowPlan: dto.tomorrowPlan,
        tags: dto.tags ?? [],
        weather: dto.weather,
        location: dto.location,
        intention: dto.intention,
        topPriorities: dto.topPriorities ?? [],
        affirmation: dto.affirmation,
        visualization: dto.visualization,
        expectedChallenges: dto.expectedChallenges,
        wentWell: dto.wentWell,
        wentWrong: dto.wentWrong,
        plannerReflection: dto.plannerReflection,
        habitReflection: dto.habitReflection,
        goalReflection: dto.goalReflection,
        goalId: dto.goalId,
        plannerDayId: dto.plannerDayId,
      },
      include: { attachments: true },
    });
    this.eventEmitter.emit(
      NOTIFICATION_EVENTS.JOURNAL_CREATED,
      new JournalCreatedEvent(userId, entry.id, entry.type),
    );
    return this.toResponse(entry);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    await this.findEntryOrThrow(userId, id);
    if (dto.goalId) {
      await this.assertGoalOwnership(userId, dto.goalId);
    }
    if (dto.plannerDayId) {
      await this.assertPlannerDayOwnership(userId, dto.plannerDayId);
    }

    const entry = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.mood !== undefined && { mood: dto.mood }),
        ...(dto.energy !== undefined && { energy: dto.energy }),
        ...(dto.productivity !== undefined && {
          productivity: dto.productivity,
        }),
        ...(dto.gratitude !== undefined && { gratitude: dto.gratitude }),
        ...(dto.wins !== undefined && { wins: dto.wins }),
        ...(dto.lessons !== undefined && { lessons: dto.lessons }),
        ...(dto.tomorrowPlan !== undefined && {
          tomorrowPlan: dto.tomorrowPlan,
        }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.weather !== undefined && { weather: dto.weather }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.intention !== undefined && { intention: dto.intention }),
        ...(dto.topPriorities !== undefined && {
          topPriorities: dto.topPriorities,
        }),
        ...(dto.affirmation !== undefined && { affirmation: dto.affirmation }),
        ...(dto.visualization !== undefined && {
          visualization: dto.visualization,
        }),
        ...(dto.expectedChallenges !== undefined && {
          expectedChallenges: dto.expectedChallenges,
        }),
        ...(dto.wentWell !== undefined && { wentWell: dto.wentWell }),
        ...(dto.wentWrong !== undefined && { wentWrong: dto.wentWrong }),
        ...(dto.plannerReflection !== undefined && {
          plannerReflection: dto.plannerReflection,
        }),
        ...(dto.habitReflection !== undefined && {
          habitReflection: dto.habitReflection,
        }),
        ...(dto.goalReflection !== undefined && {
          goalReflection: dto.goalReflection,
        }),
        ...(dto.goalId !== undefined && { goalId: dto.goalId }),
        ...(dto.plannerDayId !== undefined && {
          plannerDayId: dto.plannerDayId,
        }),
      },
      include: { attachments: true },
    });
    return this.toResponse(entry);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findEntryOrThrow(userId, id);
    // Soft delete — the milestone brief's own "Journal is never deleted automatically" rule, the
    // same principle Task/Habit/Goal already follow.
    await this.prisma.journalEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addAttachment(
    userId: string,
    dto: CreateJournalAttachmentDto,
  ): Promise<JournalAttachmentResponseDto> {
    await this.findEntryOrThrow(userId, dto.journalId);
    const attachment = await this.prisma.journalAttachment.create({
      data: {
        journalId: dto.journalId,
        fileName: dto.fileName,
        fileType: dto.fileType,
        fileSize: dto.fileSize,
        url: dto.url,
      },
    });
    return this.toAttachmentResponse(attachment);
  }

  async removeAttachment(userId: string, id: string): Promise<void> {
    const attachment = await this.prisma.journalAttachment.findFirst({
      where: { id, journal: { userId, deletedAt: null } },
    });
    if (!attachment) {
      throw new NotFoundException('Journal attachment not found');
    }
    // Hard delete, like RoutineStep/GoalMilestone — disposable metadata reached only through its
    // parent JournalEntry.
    await this.prisma.journalAttachment.delete({ where: { id } });
  }

  /** Lifetime entry count linked to a given Goal — the same small, additive, ownership-scoped
   * export TasksService.countCompletedByGoal/HabitsService.countLogsByGoal already establish for
   * Goals' progress aggregation (Milestone 9). Journal doesn't participate in Goal progress (no
   * `JOURNAL_COUNT` GoalTargetType exists — see the schema comment on JournalEntry), but the same
   * shape is useful to a future caller (e.g. Goal Detail's "N related entries" count) without a
   * second query path. */
  countByGoal(userId: string, goalId: string): Promise<number> {
    return this.prisma.journalEntry.count({
      where: { userId, goalId, deletedAt: null },
    });
  }

  private async paginate(
    where: Prisma.JournalEntryWhereInput,
    orderBy: Prisma.JournalEntryOrderByWithRelationInput,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<JournalEntryResponseDto>> {
    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: { attachments: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data: entries.map((entry) => this.toResponse(entry)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private async findEntryOrThrow(
    userId: string,
    id: string,
  ): Promise<JournalEntryWithAttachments> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, userId, deletedAt: null },
      include: { attachments: true },
    });
    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }
    return entry;
  }

  /** Same rationale as every other module's assertGoalOwnership: a raw existence check rather
   * than injecting GoalsService, since there's no need for JournalModule to depend on the whole
   * of GoalsModule just to check one id belongs to the requesting user. */
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

  /** Same shape as assertGoalOwnership, for the symmetric optional PlannerDay link. */
  private async assertPlannerDayOwnership(
    userId: string,
    plannerDayId: string,
  ): Promise<void> {
    const plannerDay = await this.prisma.plannerDay.findFirst({
      where: { id: plannerDayId, userId },
      select: { id: true },
    });
    if (!plannerDay) {
      throw new NotFoundException('Planner day not found');
    }
  }

  /** "Today" in the requesting user's own timezone — see the class doc for why this matters for
   * a day-boundary concept like Journal, mirroring PlannerService.getTimezone exactly. */
  private async todayForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    return getZonedDateString(new Date(), user?.timezone ?? 'UTC');
  }

  private toResponse(
    entry: JournalEntryWithAttachments,
  ): JournalEntryResponseDto {
    return {
      id: entry.id,
      date: formatDateOnly(entry.date),
      type: entry.type,
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      energy: entry.energy,
      productivity: entry.productivity,
      gratitude: entry.gratitude,
      wins: entry.wins,
      lessons: entry.lessons,
      tomorrowPlan: entry.tomorrowPlan,
      tags: entry.tags,
      weather: entry.weather,
      location: entry.location,
      intention: entry.intention,
      topPriorities: entry.topPriorities,
      affirmation: entry.affirmation,
      visualization: entry.visualization,
      expectedChallenges: entry.expectedChallenges,
      wentWell: entry.wentWell,
      wentWrong: entry.wentWrong,
      plannerReflection: entry.plannerReflection,
      habitReflection: entry.habitReflection,
      goalReflection: entry.goalReflection,
      goalId: entry.goalId,
      plannerDayId: entry.plannerDayId,
      attachments: entry.attachments.map((attachment) =>
        this.toAttachmentResponse(attachment),
      ),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private toAttachmentResponse(
    attachment: JournalAttachment,
  ): JournalAttachmentResponseDto {
    return {
      id: attachment.id,
      journalId: attachment.journalId,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      url: attachment.url,
      createdAt: attachment.createdAt,
    };
  }
}
