import {
  addDaysToDateString,
  formatDateOnly,
  parseDateOnly,
} from '../../planner/utils/timezone.util.js';

/**
 * Pure, framework-free day-level consistency math for the Streak Engine — kept free of Prisma/DI
 * the same way planner/utils/scheduler.util.ts is, so the "leap years, DST, timezone boundaries"
 * test requirements can be exercised as plain unit tests over fabricated data instead of needing a
 * database. StreaksService is the only caller; it fetches Habit/HabitLog/FreezeDay rows and hands
 * this module plain data.
 *
 * **Scope, by design:** this file only ever considers a user's active DAILY-frequency habits.
 * WEEKLY/MONTHLY habits don't have a meaningful "did you succeed today" answer (a "gym 3x/week"
 * habit isn't due every day), so folding them into a single day-level success flag would either be
 * vacuously true most days or unfairly block the streak on non-target days. They still earn their
 * own per-habit period streak (see StreaksService.getHabitStreak) and still count toward XP on
 * every log — they're just excluded from the *overall* day/week/month consistency metrics this
 * file computes. A user with zero active DAILY habits has nothing for these functions to evaluate;
 * callers should check `dailyHabits.length === 0` themselves (surfaced as `hasDailyHabits` in every
 * response DTO) rather than receiving a misleading zero.
 *
 * **Historical habit membership**, deliberately simplified: a habit only counts toward a given
 * day's requirement once it exists (`createdAt` <= that day) — added mid-history, it doesn't
 * retroactively fail earlier days. But once a habit is deactivated/soft-deleted, it drops out of
 * `dailyHabits` entirely at the query layer (StreaksService only ever fetches `isActive: true,
 * deletedAt: null` habits) — including from *past* days it was previously required on. Habit has
 * no point-in-time "was this active on date X" ledger, so a fully historically-accurate accounting
 * would need a new audit table, out of scope for a "gamification foundation" milestone. This means
 * archiving a habit can retroactively "clean up" days it caused to fail — a deliberate, documented
 * trade-off, not an oversight.
 */

export interface DailyHabitDefinition {
  id: string;
  targetCount: number;
  /** "YYYY-MM-DD" in the user's zone — the day this habit starts counting toward. */
  createdAtDateStr: string;
}

export interface DailyHabitLog {
  habitId: string;
  /** "YYYY-MM-DD". */
  date: string;
  completedCount: number;
}

export interface DailySuccess {
  /** "YYYY-MM-DD". */
  date: string;
  /** How many of that day's *existing* daily habits (see class doc) met their targetCount. */
  completedCount: number;
  /** How many daily habits existed as of that day — the denominator `completedCount` is out of. */
  totalCount: number;
  /** Whether a consumed FreezeDay covers this date. */
  frozen: boolean;
  /** (completedCount === totalCount) || frozen. `totalCount` is always >= 1 for any date this
   * function is asked to build, since callers clamp `fromDateStr` to the earliest daily habit's
   * creation date (see StreaksService). */
  successful: boolean;
}

/** Builds one entry per calendar day in [fromDateStr, toDateStr] (inclusive both ends), oldest
 * first — walked via `addDaysToDateString` (calendar-date arithmetic) rather than instant/ms
 * arithmetic, so a 24-hour-shifted DST day or a Feb 29 leap day is still exactly one entry, never
 * zero or two. */
export function buildDailySuccessHistory(
  dailyHabits: DailyHabitDefinition[],
  logs: DailyHabitLog[],
  frozenDates: ReadonlySet<string>,
  fromDateStr: string,
  toDateStr: string,
): DailySuccess[] {
  const logsByHabitAndDate = new Map<string, number>();
  for (const log of logs) {
    logsByHabitAndDate.set(`${log.habitId}|${log.date}`, log.completedCount);
  }

  const history: DailySuccess[] = [];
  let cursor = fromDateStr;
  // Inclusive upper bound: loop until cursor passes toDateStr, comparable as plain "YYYY-MM-DD"
  // strings since that format sorts lexicographically the same as chronologically.
  while (cursor <= toDateStr) {
    const existingHabits = dailyHabits.filter(
      (habit) => habit.createdAtDateStr <= cursor,
    );
    const completedCount = existingHabits.filter((habit) => {
      const logged = logsByHabitAndDate.get(`${habit.id}|${cursor}`) ?? 0;
      return logged >= habit.targetCount;
    }).length;
    const totalCount = existingHabits.length;
    const frozen = frozenDates.has(cursor);

    history.push({
      date: cursor,
      completedCount,
      totalCount,
      frozen,
      successful: (totalCount > 0 && completedCount === totalCount) || frozen,
    });
    cursor = addDaysToDateString(cursor, 1);
  }
  return history;
}

/** Consecutive successful days ending today, with a same-day grace period: if today's own entry
 * isn't successful yet (the day isn't over — nothing "broke" yet), the walk simply continues
 * through yesterday instead of returning 0. Only a fully-elapsed unsuccessful day ends the streak. */
export function computeCurrentStreak(
  history: readonly DailySuccess[],
  todayStr: string,
): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const day = history[i];
    if (day.date === todayStr) {
      if (day.successful) {
        streak++;
      }
      continue;
    }
    if (day.successful) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Longest run of consecutive successful days anywhere in `history` — a lifetime maximum, so
 * (unlike computeCurrentStreak) today gets no same-day grace: an in-progress, not-yet-successful
 * today just isn't part of any run, the same as any other unsuccessful day. */
export function computeLongestStreak(history: readonly DailySuccess[]): number {
  let longest = 0;
  let running = 0;
  for (const day of history) {
    if (day.successful) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }
  return longest;
}

/** Percentage of the trailing `windowDays` (ending today) that were successful. An in-progress,
 * not-yet-successful today counts at face value here (no grace) — this is a point-in-time rolling
 * metric, not something a user perceives as "broken" the way a streak is. */
export function computeConsistencyPercent(
  history: readonly DailySuccess[],
  windowDays: number,
): number {
  if (windowDays <= 0) {
    return 0;
  }
  const window = history.slice(-windowDays);
  if (window.length === 0) {
    return 0;
  }
  const successfulCount = window.filter((day) => day.successful).length;
  return Math.round((successfulCount / window.length) * 100);
}

/** Successful-day rate over the *entire* supplied history (already clamped by the caller to
 * [earliest daily habit's creation date, today] — see StreaksService), i.e. a lifetime-to-date
 * rate rather than a fixed rolling window. */
export function computeSuccessRate(history: readonly DailySuccess[]): number {
  if (history.length === 0) {
    return 0;
  }
  const successfulCount = history.filter((day) => day.successful).length;
  return Math.round((successfulCount / history.length) * 100);
}

/** Monday of the calendar week containing `dateStr`, computed the same way
 * HabitsService.currentPeriodWindow does for its own WEEKLY habits (Monday-start), so "this
 * week" means the same thing everywhere in the codebase. */
export function startOfWeek(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  // getUTCDay(): 0=Sunday..6=Saturday; shift so Monday starts the week.
  const dayOffset = (date.getUTCDay() + 6) % 7;
  return addDaysToDateString(dateStr, -dayOffset);
}

/** The 1st of the calendar month containing `dateStr`. */
export function startOfMonth(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  return `${year}-${month}-01`;
}

/** True only if every day from the Monday of the current week through today was successful —
 * false if the week has just started and even Monday itself was a miss, same as any other day. */
export function isPerfectWeek(
  history: readonly DailySuccess[],
  todayStr: string,
): boolean {
  return isPerfectRange(history, startOfWeek(todayStr), todayStr);
}

/** True only if every day from the 1st of the current month through today was successful. */
export function isPerfectMonth(
  history: readonly DailySuccess[],
  todayStr: string,
): boolean {
  return isPerfectRange(history, startOfMonth(todayStr), todayStr);
}

export interface PeriodSuccess {
  /** "YYYY-MM-DD" — the first day of this period. */
  periodStart: string;
  completedCount: number;
  met: boolean;
}

/** First day of the calendar month *after* the one containing `dateStr` — the exclusive end
 * bound of that month's period. `month` from the split string is already 1-indexed, so passing it
 * (not `month - 1`) to `Date.UTC` already lands one month ahead. */
export function nextMonthStart(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number);
  return formatDateOnly(new Date(Date.UTC(year, month, 1)));
}

/** First day of the calendar month *before* the one containing `dateStr`. */
export function previousMonthStart(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number);
  return formatDateOnly(new Date(Date.UTC(year, month - 2, 1)));
}

/** Sums a single habit's logged `completedCount` within each `[periodStart, periodEnd)` window
 * and checks it against `targetCount` — the WEEKLY/MONTHLY analog of `buildDailySuccessHistory`,
 * used by StreaksService.getHabitStreak for a single habit's own period-based streak (DAILY
 * habits use `buildDailySuccessHistory` directly instead, since a day already *is* their period). */
export function buildPeriodHistory(
  logs: readonly { date: string; completedCount: number }[],
  targetCount: number,
  periodStarts: readonly string[],
  periodEndExclusive: (periodStart: string) => string,
): PeriodSuccess[] {
  return periodStarts.map((periodStart) => {
    const end = periodEndExclusive(periodStart);
    const completedCount = logs
      .filter((log) => log.date >= periodStart && log.date < end)
      .reduce((sum, log) => sum + log.completedCount, 0);
    return { periodStart, completedCount, met: completedCount >= targetCount };
  });
}

/** Adapts a `PeriodSuccess[]` into the `{ date, successful }` shape `computeCurrentStreak`/
 * `computeLongestStreak` expect, so a single habit's WEEKLY/MONTHLY period streak reuses exactly
 * the same day-level streak-walking logic instead of a parallel implementation — "a period not
 * yet met" gets the identical same-day (here: same-period) grace an in-progress today gets. */
export function toDailySuccessLike(
  periods: readonly PeriodSuccess[],
): DailySuccess[] {
  return periods.map((period) => ({
    date: period.periodStart,
    completedCount: period.completedCount,
    totalCount: 1,
    frozen: false,
    successful: period.met,
  }));
}

function isPerfectRange(
  history: readonly DailySuccess[],
  fromDateStr: string,
  toDateStr: string,
): boolean {
  const byDate = new Map(history.map((day) => [day.date, day]));
  let cursor = fromDateStr;
  while (cursor <= toDateStr) {
    const day = byDate.get(cursor);
    // Missing from `history` means it's outside the range the caller built (shouldn't happen if
    // fromDateStr was clamped correctly) — treated as not-perfect rather than throwing, since a
    // "can't prove it was perfect" day shouldn't silently pass.
    if (!day || !day.successful) {
      return false;
    }
    cursor = addDaysToDateString(cursor, 1);
  }
  return true;
}
