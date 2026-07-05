/**
 * Framework-free, unit-testable bucketing math — the same "no Prisma/DI, pure functions" shape
 * planner/utils/scheduler.util.ts, streaks/utils/streak-calculator.util.ts, and
 * ai/utils/ai-metrics.util.ts already establish. AnalyticsService gathers plain
 * `{ date, value, total? }` rows from other modules' own data (via raw, read-only PrismaService
 * queries — the same "cross-cutting query no existing method exposes" reasoning
 * AiAnalysisService's own equivalents already document) and hands them here to become one of the
 * DAY/WEEK/MONTH/YEAR charts every `/analytics/*` domain endpoint returns.
 */

import {
  addDaysToDateString,
  formatDateOnly,
} from '../../planner/utils/timezone.util.js';

export type AnalyticsPeriodValue = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type BucketGranularity = 'DAY' | 'WEEK' | 'MONTH';

export interface PeriodRange {
  /** Inclusive, "YYYY-MM-DD". */
  from: string;
  /** Inclusive, "YYYY-MM-DD". */
  to: string;
  granularity: BucketGranularity;
}

/**
 * How far back each period looks, and at what granularity it buckets — DAY/WEEK stay
 * day-by-day (7 points max), MONTH buckets into 7-day windows (~4-5 points), YEAR buckets into
 * calendar months (12 points). Coarser buckets for longer windows keep every chart readable
 * without a client-side downsampling step.
 */
export function resolvePeriodRange(
  period: AnalyticsPeriodValue,
  todayStr: string,
): PeriodRange {
  switch (period) {
    case 'DAY':
      return { from: todayStr, to: todayStr, granularity: 'DAY' };
    case 'WEEK':
      return {
        from: addDaysToDateString(todayStr, -6),
        to: todayStr,
        granularity: 'DAY',
      };
    case 'MONTH':
      return {
        from: addDaysToDateString(todayStr, -29),
        to: todayStr,
        granularity: 'WEEK',
      };
    case 'YEAR':
      return {
        from: addDaysToDateString(todayStr, -364),
        to: todayStr,
        granularity: 'MONTH',
      };
  }
}

export interface DatedValue {
  /** "YYYY-MM-DD" */
  date: string;
  value: number;
  /** Denominator for a rate metric (e.g. tasks total, planner blocks total) — omitted for plain
   * counts (e.g. calendar events, journal entries). */
  total?: number;
}

export interface BucketedPoint {
  /** The bucket's own label — a "YYYY-MM-DD" day/week-start for DAY/WEEK granularity, "YYYY-MM"
   * for MONTH granularity. */
  bucket: string;
  value: number;
  total?: number;
}

/**
 * Buckets raw dated values into `granularity`-sized windows across `[fromStr, toStr]`, zero-filling
 * every bucket in range up front (not just the ones with data) so a line/bar chart never has a
 * silent gap for a day/week/month nothing happened — the same "always render a full window" shape
 * `habit-calendar-heatmap`'s own week-alignment padding already establishes on the frontend.
 */
export function bucketDatedValues(
  values: DatedValue[],
  fromStr: string,
  toStr: string,
  granularity: BucketGranularity,
): BucketedPoint[] {
  const buckets = new Map<string, { value: number; total: number }>();
  const keyFor = (dateStr: string): string =>
    bucketKey(dateStr, fromStr, granularity);

  for (
    let cursor = fromStr;
    cursor <= toStr;
    cursor = addDaysToDateString(cursor, 1)
  ) {
    const key = keyFor(cursor);
    if (!buckets.has(key)) {
      buckets.set(key, { value: 0, total: 0 });
    }
  }

  for (const point of values) {
    const key = keyFor(point.date);
    const bucket = buckets.get(key) ?? { value: 0, total: 0 };
    bucket.value += point.value;
    bucket.total += point.total ?? 0;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([bucket, { value, total }]) => ({
      bucket,
      value,
      ...(total > 0 && { total }),
    }));
}

function bucketKey(
  dateStr: string,
  fromStr: string,
  granularity: BucketGranularity,
): string {
  if (granularity === 'MONTH') {
    return dateStr.slice(0, 7);
  }
  if (granularity === 'WEEK') {
    const weekIndex = Math.floor(daysBetween(fromStr, dateStr) / 7);
    return addDaysToDateString(fromStr, weekIndex * 7);
  }
  return dateStr;
}

function daysBetween(fromStr: string, toStr: string): number {
  const from = Date.parse(`${fromStr}T00:00:00Z`);
  const to = Date.parse(`${toStr}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** A bucket's own completion rate (0 when it has no denominator) — used for the `summary.average*`
 * fields every domain response returns alongside its `series`. */
export function percentageOf(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

/** The equally-sized window immediately preceding `range` — used for every domain's
 * `deltaPercent` ("this window vs. the one before it"), the same comparison
 * ai/utils/ai-metrics.util.ts's weekOverWeekCompletionRate makes for its own fixed 7-vs-7 window,
 * generalized here to any period's own window length. */
export function previousRangeOf(range: { from: string; to: string }): {
  from: string;
  to: string;
} {
  const windowDays = windowLengthDays(range);
  return {
    from: addDaysToDateString(range.from, -windowDays),
    to: addDaysToDateString(range.from, -1),
  };
}

/** Inclusive day count spanned by `[from, to]` — e.g. 7 for a WEEK range. */
export function windowLengthDays(range: { from: string; to: string }): number {
  return daysBetween(range.from, range.to) + 1;
}

/** Turns two lists of dates ("opportunities" and "completions" on the same underlying entity —
 * e.g. Tasks created vs. completed, PlannerBlocks scheduled vs. completed) into one dated-value
 * series, `total` always at least `value` (a completion this instant necessarily also counts as an
 * opportunity that instant). The same shape ai-analysis.service.ts's own private buildDailyPoints
 * establishes for its fixed 14-day trend window, needed again here for Analytics' own
 * arbitrary-range charts. */
export function buildCompletionPoints(
  totalDates: Date[],
  completedDates: Date[],
): DatedValue[] {
  const byDate = new Map<string, { total: number; completed: number }>();
  for (const date of totalDates) {
    const key = formatDateOnly(date);
    const bucket = byDate.get(key) ?? { total: 0, completed: 0 };
    bucket.total++;
    byDate.set(key, bucket);
  }
  for (const date of completedDates) {
    const key = formatDateOnly(date);
    const bucket = byDate.get(key) ?? { total: 0, completed: 0 };
    bucket.completed++;
    bucket.total = Math.max(bucket.total, bucket.completed);
    byDate.set(key, bucket);
  }
  return [...byDate.entries()].map(([date, { total, completed }]) => ({
    date,
    value: completed,
    total,
  }));
}
