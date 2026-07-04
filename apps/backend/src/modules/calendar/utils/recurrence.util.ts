import {
  addDaysToDateString,
  formatDateOnly,
  zonedWallTimeToUtc,
} from '../../planner/utils/timezone.util.js';

/**
 * Pure, deterministic "recurring event preparation" — this milestone's Testing section asks only
 * for that, not a working recurrence engine: CalendarEvent has no persisted recurrence field (see
 * its schema comment), so nothing calls this automatically. It exists as the documented, tested
 * seam a future recurrence milestone builds on, the same role planner/utils/scheduler.util.ts's
 * pure functions play for POST /planner/generate.
 *
 * Deliberately timezone-aware (wall-clock date + "HH:mm" time, not a fixed millisecond stride):
 * a "daily 9am" recurrence must still land on 9am local time the day after a DST transition, not
 * 9am plus a rigid 24 hours — the same reasoning zonedWallTimeToUtc itself documents. `frequency`
 * covers DAILY/WEEKLY/MONTHLY; MONTHLY keeps the same day-of-month and lets Date.UTC's own
 * overflow handling roll a nonexistent day (e.g. day 31 in a 30-day month) into the next month —
 * a documented, accepted approximation, the same spirit as this codebase's other known,
 * documented edge-case gaps (see zonedWallTimeToUtc's own comment on skipped wall-clock times).
 */
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** Total instances to prepare, including the first (the base event's own date/time). */
  count: number;
}

export interface PreparedRecurringInstance {
  startTime: Date;
  endTime: Date;
}

export function prepareRecurringInstances(
  dateStr: string,
  startTimeStr: string,
  durationMinutes: number,
  timezone: string,
  rule: RecurrenceRule,
): PreparedRecurringInstance[] {
  const dates = expandDateStrings(dateStr, rule);
  return dates.map((instanceDate) => {
    const startTime = zonedWallTimeToUtc(instanceDate, startTimeStr, timezone);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);
    return { startTime, endTime };
  });
}

function expandDateStrings(dateStr: string, rule: RecurrenceRule): string[] {
  const dates: string[] = [dateStr];
  for (let i = 1; i < rule.count; i++) {
    const previous = dates[i - 1];
    dates.push(
      rule.frequency === 'DAILY'
        ? addDaysToDateString(previous, 1)
        : rule.frequency === 'WEEKLY'
          ? addDaysToDateString(previous, 7)
          : addMonthsToDateString(dateStr, i),
    );
  }
  return dates;
}

function addMonthsToDateString(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const totalMonths = month - 1 + months;
  const newYear = year + Math.floor(totalMonths / 12);
  const newMonth = ((totalMonths % 12) + 12) % 12;
  return formatDateOnly(new Date(Date.UTC(newYear, newMonth, day)));
}
