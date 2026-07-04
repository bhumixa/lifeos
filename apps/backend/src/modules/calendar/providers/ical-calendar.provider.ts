import { Injectable } from '@nestjs/common';
import { RemoteCalendarProvider } from './remote-calendar.provider.js';

/** Placeholder adapter for a generic .ics/CalDAV feed. Not one of the three adapters this
 * milestone's brief names explicitly (Google/Microsoft/Apple), but CalendarProvider.ICAL is a
 * real, creatable enum value on Calendar.provider (see the schema comment) — leaving it
 * unhandled in CalendarProviderRegistry would mean a legal enum value with no adapter at all, so
 * it gets the same placeholder treatment as the other three rather than being a silent gap. */
@Injectable()
export class IcalCalendarProvider extends RemoteCalendarProvider {
  protected readonly displayName = 'iCal feed';
}
