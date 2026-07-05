import { Injectable, inject } from '@angular/core';
import type { AnalyticsTimeSeriesPoint, MoodTrendDirection } from '@lifeos/shared-types';
import { forkJoin, map, type Observable } from 'rxjs';
import { AnalyticsApiService } from '../../analytics/services/analytics-api.service';

export interface DashboardAnalyticsSummary {
  weeklyProductivity: { averageCompletionRate: number; deltaPercent: number; series: AnalyticsTimeSeriesPoint[] };
  focusTrend: { totalMinutes: number; series: AnalyticsTimeSeriesPoint[] };
  habitTrend: { averageCompletionRate: number; series: AnalyticsTimeSeriesPoint[] };
  moodTrend: { direction: MoodTrendDirection; averageMoodScore: number | null; series: AnalyticsTimeSeriesPoint[] };
}

/** Derives the Dashboard's four Analytics widgets (Weekly Productivity, Focus Trend, Habit Trend,
 * Mood Trend) from the same `/analytics/productivity`, `/analytics/planner`, `/analytics/habits`,
 * and `/analytics/journal` (all `period=WEEK`) calls the Analytics feature's own pages already
 * make — no dashboard-specific endpoint, the same "reuse existing APIs, several derived widgets"
 * shape every prior Dashboard service (DashboardGoalsService, DashboardAiService, ...) already
 * establishes. */
@Injectable({ providedIn: 'root' })
export class DashboardAnalyticsService {
  private readonly analyticsApi = inject(AnalyticsApiService);

  load(): Observable<DashboardAnalyticsSummary> {
    return forkJoin({
      productivity: this.analyticsApi.getProductivity({ period: 'WEEK' }),
      planner: this.analyticsApi.getPlanner({ period: 'WEEK' }),
      habits: this.analyticsApi.getHabits({ period: 'WEEK' }),
      journal: this.analyticsApi.getJournal({ period: 'WEEK' }),
    }).pipe(
      map(({ productivity, planner, habits, journal }) => ({
        weeklyProductivity: {
          averageCompletionRate: productivity.summary.averageCompletionRate,
          deltaPercent: productivity.summary.deltaPercent,
          series: productivity.series,
        },
        focusTrend: {
          totalMinutes: planner.summary.totalFocusMinutes,
          series: planner.series,
        },
        habitTrend: {
          averageCompletionRate: habits.summary.averageCompletionRate,
          series: habits.series,
        },
        moodTrend: {
          direction: journal.summary.moodTrendDirection,
          averageMoodScore: journal.summary.averageMoodScore,
          series: journal.series,
        },
      })),
    );
  }
}
