import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type {
  AnalyticsOverview,
  AnalyticsPeriod,
  CalendarAnalytics,
  GoalsAnalytics,
  HabitsAnalytics,
  JournalAnalytics,
  PlannerAnalytics,
  ProductivityAnalytics,
} from '@lifeos/shared-types';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { BarChart } from '../../components/bar-chart/bar-chart';
import { ComparisonCard } from '../../components/comparison-card/comparison-card';
import { Heatmap, type HeatmapCell } from '../../components/heatmap/heatmap';
import { LineChart } from '../../components/line-chart/line-chart';
import { MetricCard } from '../../components/metric-card/metric-card';
import { TimeRangePicker } from '../../components/time-range-picker/time-range-picker';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { AnalyticsPeriodStore } from '../../state/analytics-period.store';
import { formatMinutes, moodTrendLabel } from '../../utils/analytics-display';

/**
 * The Analytics feature's own home page — Overview scores up top (cached via
 * AnalyticsSnapshot server-side), then one chart card per domain for the period selected via
 * TimeRangePicker. Every number here comes from the six `/analytics/*` GET endpoints this
 * milestone builds; nothing is computed client-side beyond display formatting.
 */
@Component({
  selector: 'app-analytics-dashboard-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    Skeleton,
    MetricCard,
    TimeRangePicker,
    LineChart,
    BarChart,
    Heatmap,
    ComparisonCard,
  ],
  templateUrl: './analytics-dashboard-page.html',
  styleUrl: './analytics-dashboard-page.scss',
})
export class AnalyticsDashboardPage implements OnInit {
  private readonly analyticsApi = inject(AnalyticsApiService);
  protected readonly periodStore = inject(AnalyticsPeriodStore);

  protected readonly overviewLoading = signal(true);
  protected readonly overview = signal<AnalyticsOverview | null>(null);

  protected readonly domainsLoading = signal(true);
  protected readonly productivity = signal<ProductivityAnalytics | null>(null);
  protected readonly habits = signal<HabitsAnalytics | null>(null);
  protected readonly goals = signal<GoalsAnalytics | null>(null);
  protected readonly planner = signal<PlannerAnalytics | null>(null);
  protected readonly journal = signal<JournalAnalytics | null>(null);
  protected readonly calendar = signal<CalendarAnalytics | null>(null);

  protected readonly formatMinutes = formatMinutes;
  protected readonly moodTrendLabel = moodTrendLabel;

  ngOnInit(): void {
    this.loadOverview();
    this.loadDomains();
  }

  protected onPeriodChange(period: AnalyticsPeriod): void {
    this.periodStore.setPeriod(period);
    this.loadDomains();
  }

  private loadOverview(): void {
    this.overviewLoading.set(true);
    this.analyticsApi.getOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.overviewLoading.set(false);
      },
      error: () => this.overviewLoading.set(false),
    });
  }

  private loadDomains(): void {
    this.domainsLoading.set(true);
    const query = { period: this.periodStore.period() };

    this.analyticsApi.getProductivity(query).subscribe((result) => this.productivity.set(result));
    this.analyticsApi.getHabits(query).subscribe((result) => this.habits.set(result));
    this.analyticsApi.getGoals(query).subscribe((result) => this.goals.set(result));
    this.analyticsApi.getPlanner(query).subscribe((result) => this.planner.set(result));
    this.analyticsApi.getJournal(query).subscribe((result) => this.journal.set(result));
    this.analyticsApi.getCalendar(query).subscribe({
      next: (result) => {
        this.calendar.set(result);
        this.domainsLoading.set(false);
      },
      error: () => this.domainsLoading.set(false),
    });
  }

  protected journalHeatmapCells(): HeatmapCell[] {
    const series = this.journal()?.series ?? [];
    return series.map((point) => ({ date: point.bucket, value: point.total ?? 0 }));
  }
}
