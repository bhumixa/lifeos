import type { PaginatedResult } from './task.types.js';

export type AnalyticsPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type ExportFormat = 'PDF' | 'CSV' | 'JSON';

/** A 1:1 match to the seven read-only GET domain endpoints — see docs/API.md's Analytics
 * section. */
export type AnalyticsReportType =
  | 'OVERVIEW'
  | 'PRODUCTIVITY'
  | 'HABITS'
  | 'GOALS'
  | 'PLANNER'
  | 'JOURNAL'
  | 'CALENDAR';

/** One point on any domain chart — meaning of `value`/`total` is documented per response type
 * below (e.g. Productivity: value=completed, total=due; Journal: value=average mood score,
 * total=entry count; Calendar: value=event count, no total). */
export interface AnalyticsTimeSeriesPoint {
  /** "YYYY-MM-DD" for DAY/WEEK/MONTH granularity, "YYYY-MM" for YEAR. */
  bucket: string;
  value: number;
  total?: number;
}

export interface AnalyticsQueryParams {
  period?: AnalyticsPeriod;
}

export interface AnalyticsOverview {
  snapshotDate: string;
  productivityScore: number;
  habitScore: number;
  plannerScore: number;
  goalScore: number;
  journalScore: number;
  focusMinutes: number;
  streakDays: number;
  activeInsightCount: number;
  unreadNotificationCount: number;
  /** True when this was read from the AnalyticsSnapshot cache rather than computed fresh. */
  cached: boolean;
}

export interface ProductivitySummary {
  averageCompletionRate: number;
  deltaPercent: number;
  bestWeekdays: string[];
}

export interface ProductivityAnalytics {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  series: AnalyticsTimeSeriesPoint[];
  summary: ProductivitySummary;
}

export interface HabitsSummary {
  averageCompletionRate: number;
  totalActiveHabits: number;
  totalLogs: number;
}

export interface HabitsAnalytics {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  series: AnalyticsTimeSeriesPoint[];
  summary: HabitsSummary;
}

export interface GoalsSummary {
  activeCount: number;
  completedCount: number;
  completionRate: number;
  averageProgressPercent: number;
}

export interface GoalsAnalytics {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  series: AnalyticsTimeSeriesPoint[];
  summary: GoalsSummary;
}

export interface PlannerSummary {
  averageUtilizationRate: number;
  totalFocusMinutes: number;
  totalBlocksCompleted: number;
}

export interface PlannerAnalytics {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  series: AnalyticsTimeSeriesPoint[];
  summary: PlannerSummary;
}

export type MoodTrendDirection = 'IMPROVING' | 'DECLINING' | 'STABLE';

export interface JournalSummary {
  consistencyRate: number;
  moodTrendDirection: MoodTrendDirection;
  moodTrendConsecutiveDays: number;
  averageMoodScore: number | null;
}

export interface JournalAnalytics {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  series: AnalyticsTimeSeriesPoint[];
  summary: JournalSummary;
}

export interface CalendarSummary {
  totalEvents: number;
  upcomingEvents: number;
  busiestWeekday: string | null;
  averageEventsPerDay: number;
}

export interface CalendarAnalytics {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  series: AnalyticsTimeSeriesPoint[];
  summary: CalendarSummary;
}

export interface AnalyticsExport {
  id: string;
  type: string;
  format: ExportFormat;
  status: 'COMPLETED' | 'FAILED';
  filePath: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export type PaginatedAnalyticsExports = PaginatedResult<AnalyticsExport>;

export interface ListAnalyticsExportsQueryParams {
  page?: number;
  pageSize?: number;
}

export interface CreateAnalyticsExportRequest {
  type: AnalyticsReportType;
  format: ExportFormat;
  period?: AnalyticsPeriod;
}

/** `POST /analytics/export`'s own response — the generated file's text content is returned
 * inline (no separate download endpoint exists), so the frontend can trigger a browser download
 * directly from this response. Null for a FAILED/NOT_IMPLEMENTED attempt (every PDF request
 * today). */
export interface AnalyticsExportResult extends AnalyticsExport {
  content: string | null;
}
