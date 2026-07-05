import type { AnalyticsPeriod, AnalyticsReportType, MoodTrendDirection } from '@lifeos/shared-types';

/** "Day" / "Week" / "Month" / "Year" — the TimeRangePicker's own button labels. */
export function periodLabel(period: AnalyticsPeriod): string {
  switch (period) {
    case 'DAY':
      return 'Day';
    case 'WEEK':
      return 'Week';
    case 'MONTH':
      return 'Month';
    case 'YEAR':
      return 'Year';
  }
}

const REPORT_TYPE_LABELS: Record<AnalyticsReportType, string> = {
  OVERVIEW: 'Overview',
  PRODUCTIVITY: 'Productivity',
  HABITS: 'Habits',
  GOALS: 'Goals',
  PLANNER: 'Planner',
  JOURNAL: 'Journal',
  CALENDAR: 'Calendar',
};

/** Accepts a plain `string` (not just `AnalyticsReportType`) since `AnalyticsExport.type` from
 * export history is stored as a free-text column server-side (see prisma/schema.prisma's comment
 * on AnalyticsExport) — an unrecognized value falls back to the raw string rather than throwing. */
export function reportTypeLabel(type: AnalyticsReportType | string): string {
  return REPORT_TYPE_LABELS[type as AnalyticsReportType] ?? type;
}

/** 0-100 score bucketed into a traffic-light level — drives MetricCard's accent color. Small,
 * feature-local formatter rather than a shared utility for one three-way split, the same
 * "duplicate a tiny pure function instead of importing across feature boundaries" precedent
 * habit-display.ts's own formatReminderTime documents. */
export type ScoreLevel = 'low' | 'medium' | 'high';

export function scoreLevel(score: number): ScoreLevel {
  if (score >= 70) {
    return 'high';
  }
  if (score >= 40) {
    return 'medium';
  }
  return 'low';
}

/** "1h 30m" / "45m" — same small formatter Planner/Routine each keep their own copy of, rather
 * than importing across feature boundaries for one helper. */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** "+8%" / "-12%" / "0%" — the sign is never implicit, since a bare "8%" reads as this period's
 * rate, not a change. */
export function formatDeltaPercent(delta: number): string {
  if (delta > 0) {
    return `+${delta}%`;
  }
  return `${delta}%`;
}

const MOOD_TREND_LABELS: Record<MoodTrendDirection, string> = {
  IMPROVING: 'Improving',
  DECLINING: 'Declining',
  STABLE: 'Stable',
};

export function moodTrendLabel(direction: MoodTrendDirection): string {
  return MOOD_TREND_LABELS[direction];
}
