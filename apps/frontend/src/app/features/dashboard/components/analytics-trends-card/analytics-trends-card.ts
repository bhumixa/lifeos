import { Component, input } from '@angular/core';
import { TrendCard } from '../../../analytics/components/trend-card/trend-card';
import { formatMinutes, moodTrendLabel } from '../../../analytics/utils/analytics-display';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import type { DashboardAnalyticsSummary } from '../../services/dashboard-analytics.service';

/** Composes Analytics' own exported `TrendCard` directly (cross-feature component reuse, the same
 * precedent Notifications' `NotificationBell`/AI Coach's `RecommendationCard` already set for the
 * app shell/Dashboard) rather than a second sparkline-card implementation — four instances for
 * Weekly Productivity/Focus Trend/Habit Trend/Mood Trend, all four derived from
 * DashboardAnalyticsService's own composition of existing `/analytics/*` calls. */
@Component({
  selector: 'app-analytics-trends-card',
  imports: [TrendCard, Skeleton],
  templateUrl: './analytics-trends-card.html',
  styleUrl: './analytics-trends-card.scss',
})
export class AnalyticsTrendsCard {
  readonly summary = input<DashboardAnalyticsSummary | null>(null);
  readonly loading = input(false);

  protected readonly formatMinutes = formatMinutes;
  protected readonly moodTrendLabel = moodTrendLabel;
}
