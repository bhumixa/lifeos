import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { Prisma, type CalendarEvent } from '../../../generated/prisma/index.js';
import { hasOverlap, type Interval } from '../planner/utils/scheduler.util.js';
import { CalendarService } from './calendar.service.js';
import type { CreateCalendarEventDto } from './dto/create-calendar-event.dto.js';
import type { UpdateCalendarEventDto } from './dto/update-calendar-event.dto.js';
import type { ListCalendarEventsQueryDto } from './dto/list-calendar-events-query.dto.js';
import type { CalendarEventResponseDto } from './dto/calendar-response.dto.js';

/**
 * Ownership follows the same pattern as PlannerBlock/RoutineStep: CalendarEvent has no `userId`
 * column of its own, so every lookup joins through `calendar: { userId }`.
 *
 * The four optional cross-links (`plannerBlockId`/`taskId`/`goalId`/`journalEntryId`) are
 * ownership-validated the same way TasksService/PlannerService/JournalService already validate
 * `goalId` — a raw Prisma existence check scoped to the requesting user, not by injecting
 * TasksService/GoalsService/PlannerService/JournalService (this module imports none of them,
 * avoiding both the circular-import risk GoalsModule already had to route around and any
 * dependency on a whole sibling module just to check one id belongs to the requesting user).
 *
 * Hard delete: a CalendarEvent's own row is disposable scheduling data, not the irreplaceable
 * content docs/06-database-design.md's soft-delete principle protects — the same treatment
 * PlannerBlock/RoutineStep already get. Deleting the *linked* Task/Goal/PlannerBlock/JournalEntry
 * is a different operation entirely and never deletes this row (onDelete: SetNull — see the
 * schema comment on CalendarEvent); that's what "deleting linked objects should never delete
 * calendar history automatically" means in practice.
 */
@Injectable()
export class CalendarEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarService,
  ) {}

  async findAll(
    userId: string,
    query: ListCalendarEventsQueryDto,
  ): Promise<PaginatedResult<CalendarEventResponseDto>> {
    const where: Prisma.CalendarEventWhereInput = {
      calendar: { userId },
      ...(query.calendarId && { calendarId: query.calendarId }),
      ...(query.status && { status: query.status }),
      ...(query.taskId && { taskId: query.taskId }),
      ...(query.goalId && { goalId: query.goalId }),
      ...(query.plannerBlockId && { plannerBlockId: query.plannerBlockId }),
      ...(query.journalEntryId && { journalEntryId: query.journalEntryId }),
      ...((query.from ?? query.to) && {
        startTime: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [events, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        orderBy: { startTime: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.calendarEvent.count({ where }),
    ]);

    const responses = await Promise.all(
      events.map((event) => this.toResponse(event)),
    );

    return {
      data: responses,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<CalendarEventResponseDto> {
    const event = await this.findEventOrThrow(userId, id);
    return this.toResponse(event);
  }

  async create(
    userId: string,
    dto: CreateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    await this.calendarService.findCalendarOrThrow(userId, dto.calendarId);
    if (dto.plannerBlockId) {
      await this.assertPlannerBlockOwnership(userId, dto.plannerBlockId);
    }
    if (dto.taskId) {
      await this.assertTaskOwnership(userId, dto.taskId);
    }
    if (dto.goalId) {
      await this.assertGoalOwnership(userId, dto.goalId);
    }
    if (dto.journalEntryId) {
      await this.assertJournalEntryOwnership(userId, dto.journalEntryId);
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.assertValidRange(startTime, endTime);

    const event = await this.prisma.calendarEvent.create({
      data: {
        calendarId: dto.calendarId,
        plannerBlockId: dto.plannerBlockId,
        taskId: dto.taskId,
        goalId: dto.goalId,
        journalEntryId: dto.journalEntryId,
        title: dto.title,
        description: dto.description,
        startTime,
        endTime,
        allDay: dto.allDay,
        location: dto.location,
      },
    });
    return this.toResponse(event);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    const existing = await this.findEventOrThrow(userId, id);
    if (dto.calendarId) {
      await this.calendarService.findCalendarOrThrow(userId, dto.calendarId);
    }
    if (dto.plannerBlockId) {
      await this.assertPlannerBlockOwnership(userId, dto.plannerBlockId);
    }
    if (dto.taskId) {
      await this.assertTaskOwnership(userId, dto.taskId);
    }
    if (dto.goalId) {
      await this.assertGoalOwnership(userId, dto.goalId);
    }
    if (dto.journalEntryId) {
      await this.assertJournalEntryOwnership(userId, dto.journalEntryId);
    }

    const startTime = dto.startTime
      ? new Date(dto.startTime)
      : existing.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : existing.endTime;
    if (dto.startTime ?? dto.endTime) {
      this.assertValidRange(startTime, endTime);
    }

    const event = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.calendarId !== undefined && { calendarId: dto.calendarId }),
        ...(dto.plannerBlockId !== undefined && {
          plannerBlockId: dto.plannerBlockId,
        }),
        ...(dto.taskId !== undefined && { taskId: dto.taskId }),
        ...(dto.goalId !== undefined && { goalId: dto.goalId }),
        ...(dto.journalEntryId !== undefined && {
          journalEntryId: dto.journalEntryId,
        }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.allDay !== undefined && { allDay: dto.allDay }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...((dto.startTime ?? dto.endTime) && { startTime, endTime }),
      },
    });
    return this.toResponse(event);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findEventOrThrow(userId, id);
    // Hard delete — see the class doc above.
    await this.prisma.calendarEvent.delete({ where: { id } });
  }

  private async findEventOrThrow(
    userId: string,
    id: string,
  ): Promise<CalendarEvent> {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, calendar: { userId } },
    });
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }
    return event;
  }

  private async assertTaskOwnership(
    userId: string,
    taskId: string,
  ): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

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

  private async assertPlannerBlockOwnership(
    userId: string,
    plannerBlockId: string,
  ): Promise<void> {
    const block = await this.prisma.plannerBlock.findFirst({
      where: { id: plannerBlockId, plannerDay: { userId } },
      select: { id: true },
    });
    if (!block) {
      throw new NotFoundException('Planner block not found');
    }
  }

  private async assertJournalEntryOwnership(
    userId: string,
    journalEntryId: string,
  ): Promise<void> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id: journalEntryId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }
  }

  private assertValidRange(startTime: Date, endTime: Date): void {
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  /** Conflicts are computed on read, not stored — see the class doc on CalendarEvent. Only
   * ACTIVE siblings in the same calendar are considered; a DISABLED event has already been taken
   * out of contention by the user, the same way Planner's own generation only tracks FIXED
   * blocks as "occupied," not anything it doesn't need to route around. */
  private async computeConflicts(event: CalendarEvent): Promise<string[]> {
    if (event.status === 'DISABLED') {
      return [];
    }
    const siblings = await this.prisma.calendarEvent.findMany({
      where: {
        calendarId: event.calendarId,
        status: 'ACTIVE',
        id: { not: event.id },
      },
      select: { id: true, startTime: true, endTime: true },
    });
    const candidate: Interval = { start: event.startTime, end: event.endTime };
    return siblings
      .filter((sibling) =>
        hasOverlap(candidate, [
          { start: sibling.startTime, end: sibling.endTime },
        ]),
      )
      .map((sibling) => sibling.id);
  }

  private async toResponse(
    event: CalendarEvent,
  ): Promise<CalendarEventResponseDto> {
    const conflictsWith = await this.computeConflicts(event);
    return {
      id: event.id,
      calendarId: event.calendarId,
      plannerBlockId: event.plannerBlockId,
      taskId: event.taskId,
      goalId: event.goalId,
      journalEntryId: event.journalEntryId,
      externalId: event.externalId,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      location: event.location,
      source: event.source,
      status: event.status,
      conflictsWith,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
