import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { Calendar } from '../../../generated/prisma/index.js';
import type { CreateCalendarDto } from './dto/create-calendar.dto.js';
import type { CalendarResponseDto } from './dto/calendar-response.dto.js';
import type { ListCalendarsQueryDto } from './dto/list-calendars-query.dto.js';
import type { UpdateCalendarDto } from './dto/update-calendar.dto.js';

/**
 * Ownership follows the same pattern as every other module: every lookup is scoped by `userId`,
 * and a calendar that exists but belongs to someone else is a 404, not a 403 (see
 * docs/05-architecture.md's security rules). Calendar is a plain user-owned container — like
 * Routine/Habit/Goal, not a singleton — so a user may have any number of them, LOCAL or otherwise
 * (see the class doc on Calendar in prisma/schema.prisma for what a non-LOCAL provider means
 * today).
 *
 * Hard delete: like Routine, a Calendar is disposable configuration, not the irreplaceable
 * content docs/06-database-design.md's soft-delete principle protects — deleting one cascades to
 * its own CalendarEvents/CalendarSyncs (that's the calendar's *own* history), which is a
 * different thing entirely from the milestone's "deleting linked objects should never delete
 * calendar history automatically" rule (that rule is about a Task/Goal/PlannerBlock/JournalEntry
 * being deleted, not about the Calendar itself — see the comment on CalendarEvent).
 */
@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: ListCalendarsQueryDto,
  ): Promise<CalendarResponseDto[]> {
    const calendars = await this.prisma.calendar.findMany({
      where: {
        userId,
        ...(query.provider && { provider: query.provider }),
        ...(query.enabled !== undefined && { enabled: query.enabled }),
      },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(calendars.map((calendar) => this.toResponse(calendar)));
  }

  async findOne(userId: string, id: string): Promise<CalendarResponseDto> {
    const calendar = await this.findCalendarOrThrow(userId, id);
    return this.toResponse(calendar);
  }

  async create(
    userId: string,
    dto: CreateCalendarDto,
  ): Promise<CalendarResponseDto> {
    const calendar = await this.prisma.calendar.create({
      data: {
        userId,
        name: dto.name,
        provider: dto.provider,
        color: dto.color,
        timezone: dto.timezone,
        enabled: dto.enabled,
      },
    });
    return this.toResponse(calendar);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCalendarDto,
  ): Promise<CalendarResponseDto> {
    await this.findCalendarOrThrow(userId, id);
    const calendar = await this.prisma.calendar.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.provider !== undefined && { provider: dto.provider }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });
    return this.toResponse(calendar);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findCalendarOrThrow(userId, id);
    // Hard delete — see the class doc above. Cascades to this calendar's own CalendarEvent/
    // CalendarSync rows at the database level (onDelete: Cascade on both).
    await this.prisma.calendar.delete({ where: { id } });
  }

  /** Same rationale as every other module's assertGoalOwnership: a raw existence check, reused
   * by CalendarEventsService/CalendarSyncService rather than duplicated — a single source of
   * truth for "does this calendar belong to this user" within the module itself. */
  async findCalendarOrThrow(userId: string, id: string): Promise<Calendar> {
    const calendar = await this.prisma.calendar.findFirst({
      where: { id, userId },
    });
    if (!calendar) {
      throw new NotFoundException('Calendar not found');
    }
    return calendar;
  }

  private async toResponse(calendar: Calendar): Promise<CalendarResponseDto> {
    const [eventCount, latestSync] = await Promise.all([
      this.prisma.calendarEvent.count({ where: { calendarId: calendar.id } }),
      this.prisma.calendarSync.findFirst({
        where: { calendarId: calendar.id },
        orderBy: { createdAt: 'desc' },
        select: { lastSync: true },
      }),
    ]);
    return {
      id: calendar.id,
      name: calendar.name,
      provider: calendar.provider,
      color: calendar.color,
      timezone: calendar.timezone,
      enabled: calendar.enabled,
      eventCount,
      lastSyncedAt: latestSync?.lastSync ?? null,
      createdAt: calendar.createdAt,
      updatedAt: calendar.updatedAt,
    };
  }
}
