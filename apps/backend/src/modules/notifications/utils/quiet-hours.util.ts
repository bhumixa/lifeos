/**
 * Framework-free, unit-testable quiet-hours math — the same "pure functions, no DI/Prisma
 * mocking needed" shape planner/utils/timezone.util.ts and streaks/utils/streak-calculator.util.ts
 * already establish for their own subtly-easy-to-get-wrong logic. Reuses
 * planner/utils/timezone.util.ts's zoned-time helpers directly (a plain file import, not through
 * PlannerService — these are pure functions with no DI/state needs), the same cross-module reuse
 * precedent Streaks/Journal/Calendar already set for that file.
 */
import {
  addDaysToDateString,
  getZonedDateString,
  getZonedTimeOfDay,
  zonedWallTimeToUtc,
} from '../../planner/utils/timezone.util.js';

function toMinutesSinceMidnight(hhmm: string): number {
  const [hour, minute] = hhmm.split(':').map(Number);
  return hour * 60 + minute;
}

/**
 * `start === end` is treated as "no window" (disabled) rather than "quiet 24 hours a day" — an
 * accidental equal pair (e.g. a UI default of "22:00"/"22:00" before a user picks a real end time)
 * should never silently suppress every notification. A window where `start > end` wraps past
 * midnight (e.g. 22:00-07:00); `start < end` is a same-day window (e.g. 13:00-14:00).
 */
export function isWithinQuietHours(
  nowMinutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes === endMinutes) {
    return false;
  }
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/**
 * Returns `requestedAt` unchanged when quiet hours are off (either bound null) or the current
 * moment falls outside the configured window; otherwise returns the UTC instant of
 * `quietHoursEnd` on whichever calendar date it actually falls on — the same date as `requestedAt`
 * for a same-day window, or the next calendar date for an overnight window whose end time is
 * "tomorrow morning" relative to when the check ran.
 */
export function computeScheduledFor(
  requestedAt: Date,
  timezone: string,
  quietHoursStart: string | null,
  quietHoursEnd: string | null,
): Date {
  if (!quietHoursStart || !quietHoursEnd) {
    return requestedAt;
  }

  const dateStr = getZonedDateString(requestedAt, timezone);
  const { hour, minute } = getZonedTimeOfDay(requestedAt, timezone);
  const nowMinutes = hour * 60 + minute;
  const startMinutes = toMinutesSinceMidnight(quietHoursStart);
  const endMinutes = toMinutesSinceMidnight(quietHoursEnd);

  if (!isWithinQuietHours(nowMinutes, startMinutes, endMinutes)) {
    return requestedAt;
  }

  // Only an overnight window (start > end) can put "now" on the evening side of midnight
  // (nowMinutes >= startMinutes) — that's the one case where quietHoursEnd belongs to tomorrow.
  const endDateStr =
    startMinutes > endMinutes && nowMinutes >= startMinutes
      ? addDaysToDateString(dateStr, 1)
      : dateStr;

  return zonedWallTimeToUtc(endDateStr, quietHoursEnd, timezone);
}
