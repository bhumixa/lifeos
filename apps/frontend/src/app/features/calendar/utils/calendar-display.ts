import type { CalendarEvent } from '@lifeos/shared-types';

/** "9:00 AM", in the viewer's local timezone. Small feature-local copy — same precedent
 * habit-display.ts/planner-display.ts already set for not importing tiny generic display helpers
 * across feature boundaries (see planner-display.ts's own comment on formatDuration). */
export function formatEventTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatEventTimeRange(event: Pick<CalendarEvent, 'startTime' | 'endTime' | 'allDay'>): string {
  if (event.allDay) {
    return 'All day';
  }
  return `${formatEventTime(event.startTime)} – ${formatEventTime(event.endTime)}`;
}

/** Formats a Date as "YYYY-MM-DD" using its *local* calendar date — same fix
 * planner-display.ts/habit-display.ts already document for avoiding `toISOString().slice(0,10)`'s
 * UTC-shift bug. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToLocalDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return toLocalDateString(new Date(year, month - 1, day + days));
}

/** Minutes since local midnight for an ISO datetime — used to position an event vertically in
 * the Day View's hour grid. */
export function minutesSinceMidnight(isoDateTime: string): number {
  const date = new Date(isoDateTime);
  return date.getHours() * 60 + date.getMinutes();
}

/** Start-of-day (local) ISO instant for a "YYYY-MM-DD" string — used to build the `from`/`to`
 * range GET /calendar/events is queried with for a given view. */
export function startOfLocalDayIso(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

export function endOfLocalDayIso(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

/** Monday-start week (matching HabitsService/PlannerService's own week-window convention) —
 * returns the 7 "YYYY-MM-DD" dates from Monday through Sunday containing `dateStr`. */
export function weekDatesContaining(dateStr: string): string[] {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = (new Date(year, month - 1, day).getDay() + 6) % 7;
  const monday = addDaysToLocalDateString(dateStr, -dayOfWeek);
  return Array.from({ length: 7 }, (_, index) => addDaysToLocalDateString(monday, index));
}

/** All "YYYY-MM-DD" dates in the calendar month grid containing `dateStr`, including the
 * leading/trailing days from adjacent months needed to fill complete weeks (Sunday-start, to
 * match JournalCalendar's own month-grid convention). */
export function monthGridDates(dateStr: string): string[] {
  const [year, month] = dateStr.split('-').map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const dates: string[] = [];
  const firstCellDate = toLocalDateString(new Date(year, month - 1, 1 - leadingBlanks));
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    dates.push(addDaysToLocalDateString(firstCellDate, i));
  }
  return dates;
}

export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const date = toLocalDateString(new Date(event.startTime));
    const bucket = byDate.get(date) ?? [];
    bucket.push(event);
    byDate.set(date, bucket);
  }
  return byDate;
}
