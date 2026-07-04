import type {
  CalendarSyncResult,
  ICalendarProvider,
} from './calendar-provider.interface.js';

/**
 * Shared placeholder behavior for every non-LOCAL provider. This milestone's instructions are
 * explicit — "Do not implement OAuth. Do not call external APIs. Only build extensible
 * architecture." — so GoogleCalendarProvider/MicrosoftCalendarProvider/AppleCalendarProvider/
 * IcalCalendarProvider all extend this rather than each hand-writing the same "not implemented
 * yet" result (CLAUDE.md's "never duplicate logic" rule). A future milestone that adds a real
 * OAuth/API integration for one provider deletes that one subclass's inheritance from this base
 * and gives it a real `sync` body — the other three stay untouched.
 */
export abstract class RemoteCalendarProvider implements ICalendarProvider {
  protected abstract readonly displayName: string;

  sync(): Promise<CalendarSyncResult> {
    return Promise.resolve({
      status: 'FAILED',
      errorMessage: `${this.displayName} sync is not yet implemented — OAuth and API integration are a planned future milestone.`,
    });
  }
}
