import { Injectable } from '@nestjs/common';
import { CalendarProvider } from '../../../../generated/prisma/index.js';
import { AppleCalendarProvider } from './apple-calendar.provider.js';
import type { ICalendarProvider } from './calendar-provider.interface.js';
import { GoogleCalendarProvider } from './google-calendar.provider.js';
import { IcalCalendarProvider } from './ical-calendar.provider.js';
import { LocalCalendarProvider } from './local-calendar.provider.js';
import { MicrosoftCalendarProvider } from './microsoft-calendar.provider.js';

/**
 * Maps a Calendar's `provider` enum value to the adapter that knows how to sync it — the single
 * place CalendarSyncService (and nothing else) needs to know every concrete provider class
 * exists. Adding a fifth provider later means adding one line here, not touching
 * CalendarController/CalendarSyncService's own logic — the same data-driven-catalog goal
 * Achievement/JournalPrompt already meet via a definitions array instead of hardcoded branches.
 */
@Injectable()
export class CalendarProviderRegistry {
  private readonly providers: Record<CalendarProvider, ICalendarProvider>;

  constructor(
    local: LocalCalendarProvider,
    google: GoogleCalendarProvider,
    microsoft: MicrosoftCalendarProvider,
    apple: AppleCalendarProvider,
    ical: IcalCalendarProvider,
  ) {
    this.providers = {
      [CalendarProvider.LOCAL]: local,
      [CalendarProvider.GOOGLE]: google,
      [CalendarProvider.MICROSOFT]: microsoft,
      [CalendarProvider.APPLE]: apple,
      [CalendarProvider.ICAL]: ical,
    };
  }

  resolve(provider: CalendarProvider): ICalendarProvider {
    return this.providers[provider];
  }
}
