import { Module } from '@nestjs/common';
import { CalendarEventsService } from './calendar-events.service.js';
import { CalendarSyncService } from './calendar-sync.service.js';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';
import { AppleCalendarProvider } from './providers/apple-calendar.provider.js';
import { CalendarProviderRegistry } from './providers/calendar-provider.registry.js';
import { GoogleCalendarProvider } from './providers/google-calendar.provider.js';
import { IcalCalendarProvider } from './providers/ical-calendar.provider.js';
import { LocalCalendarProvider } from './providers/local-calendar.provider.js';
import { MicrosoftCalendarProvider } from './providers/microsoft-calendar.provider.js';

@Module({
  // No sibling feature modules imported — like Journal (Milestone 10), every cross-link
  // (Task/Goal/PlannerBlock/JournalEntry) is ownership-validated via a raw Prisma existence
  // check rather than injecting TasksService/GoalsService/PlannerService/JournalService (see the
  // class doc on CalendarEventsService).
  controllers: [CalendarController],
  providers: [
    CalendarService,
    CalendarEventsService,
    CalendarSyncService,
    CalendarProviderRegistry,
    LocalCalendarProvider,
    GoogleCalendarProvider,
    MicrosoftCalendarProvider,
    AppleCalendarProvider,
    IcalCalendarProvider,
  ],
})
export class CalendarModule {}
