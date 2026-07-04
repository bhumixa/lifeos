/**
 * Not emitted anywhere yet. Unlike the other six events, "a calendar event is starting soon" has
 * no natural write to hang an emission off of — it's a time-based condition ("this event's
 * startTime is N minutes from now"), not a reaction to a create/update/complete call. Emitting it
 * for real needs a periodic scan (a future background worker calling
 * NotificationSchedulerService.scanUpcomingCalendarEvents, see its class doc), which this
 * milestone deliberately doesn't wire up automatically — the same "documented, tested seam, never
 * automatically invoked" precedent Calendar's own recurrence.util.ts already set. The event class,
 * the @OnEvent listener, and the scan method all exist and are unit-tested; only the periodic
 * trigger is future work.
 */
export class CalendarEventStartingEvent {
  constructor(
    readonly userId: string,
    readonly calendarEventId: string,
    readonly title: string,
    readonly startTime: Date,
  ) {}
}
