import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { CalendarService } from './calendar.service.js';
import { CalendarProviderRegistry } from './providers/calendar-provider.registry.js';
import type { SyncCalendarDto } from './dto/sync-calendar.dto.js';
import type { CalendarSyncResponseDto } from './dto/calendar-response.dto.js';

/**
 * POST /calendar/sync's own logic — deliberately thin. It resolves the calendar's provider
 * adapter via CalendarProviderRegistry, awaits its `sync` result, and persists exactly one new
 * CalendarSync row per attempt (see the class doc on CalendarSync for why this is append-only,
 * not a single mutable status). LocalCalendarProvider always succeeds immediately (see its own
 * class doc); every other provider returns a documented FAILED result today (see
 * RemoteCalendarProvider) — this service doesn't know or care which, keeping it agnostic to how
 * many providers exist or which ones are actually implemented yet.
 */
@Injectable()
export class CalendarSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarService,
    private readonly providerRegistry: CalendarProviderRegistry,
  ) {}

  async sync(
    userId: string,
    dto: SyncCalendarDto,
  ): Promise<CalendarSyncResponseDto> {
    const calendar = await this.calendarService.findCalendarOrThrow(
      userId,
      dto.calendarId,
    );
    const provider = this.providerRegistry.resolve(calendar.provider);
    const result = await provider.sync(calendar);

    const sync = await this.prisma.calendarSync.create({
      data: {
        calendarId: calendar.id,
        status: result.status,
        errorMessage: result.errorMessage ?? null,
        lastSync: result.status === 'SUCCESS' ? new Date() : null,
      },
    });

    return {
      id: sync.id,
      calendarId: sync.calendarId,
      lastSync: sync.lastSync,
      status: sync.status,
      errorMessage: sync.errorMessage,
      createdAt: sync.createdAt,
    };
  }
}
