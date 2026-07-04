import type { Calendar } from '../../../../generated/prisma/index.js';

/** What POST /calendar/sync persists as a new CalendarSync row — see the comment on
 * CalendarSync in prisma/schema.prisma for why this is an append-only log entry, not a
 * single mutable "last known state." */
export interface CalendarSyncResult {
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

/**
 * The seam every calendar backend (local or external) implements — CalendarSyncService depends
 * only on this interface, never on a concrete provider, so adding a fifth provider later never
 * requires touching CalendarController/CalendarSyncService (the same "data-driven, not
 * hardcoded-in-the-controller" goal Achievement/JournalPrompt already meet for their own catalogs).
 *
 * `sync` is deliberately the only method this milestone defines. A real external integration would
 * eventually need more (fetch remote events, push local changes, handle webhooks) but per this
 * milestone's own instructions ("Do not implement OAuth. Do not call external APIs. Only build
 * extensible architecture."), `sync` is the one operation POST /calendar/sync actually calls today,
 * and it's the natural seam for whatever a future OAuth/API milestone adds without changing this
 * interface's shape — only swapping RemoteCalendarProvider's placeholder body for a real one.
 */
export interface ICalendarProvider {
  /** True for LocalCalendarProvider (nothing external to reconcile — see the comment on
   * LocalCalendarProvider); false for every remote provider until OAuth/API integration exists. */
  sync(calendar: Calendar): Promise<CalendarSyncResult>;
}
