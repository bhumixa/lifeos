import { Injectable } from '@nestjs/common';
import type {
  CalendarSyncResult,
  ICalendarProvider,
} from './calendar-provider.interface.js';

/**
 * The only provider that actually does something today. A LOCAL calendar's events already live
 * entirely in this database — there is nothing external to fetch or reconcile — so `sync` is a
 * deliberate, immediate no-op success rather than a stub: it's what "Local calendar must work
 * completely without external providers" (the milestone's own business rule) means for the one
 * endpoint (POST /calendar/sync) that every Calendar, regardless of provider, can call.
 */
@Injectable()
export class LocalCalendarProvider implements ICalendarProvider {
  sync(): Promise<CalendarSyncResult> {
    return Promise.resolve({ status: 'SUCCESS' });
  }
}
