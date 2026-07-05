import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import type {
  AnalyticsOverview,
  AnalyticsReportType,
  CalendarAnalytics,
  GoalsAnalytics,
  HabitsAnalytics,
  JournalAnalytics,
  PlannerAnalytics,
  ProductivityAnalytics,
} from '@lifeos/shared-types';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { BarChart } from '../../components/bar-chart/bar-chart';
import { ExportDialog } from '../../components/export-dialog/export-dialog';
import { Heatmap, type HeatmapCell } from '../../components/heatmap/heatmap';
import { LineChart } from '../../components/line-chart/line-chart';
import { MetricCard } from '../../components/metric-card/metric-card';
import { TimeRangePicker } from '../../components/time-range-picker/time-range-picker';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { AnalyticsPeriodStore } from '../../state/analytics-period.store';
import { formatMinutes, moodTrendLabel, reportTypeLabel } from '../../utils/analytics-display';

const REPORT_TYPES: AnalyticsReportType[] = ['OVERVIEW', 'PRODUCTIVITY', 'HABITS', 'GOALS', 'PLANNER', 'JOURNAL', 'CALENDAR'];

/** A deep-dive view of one domain at a time — the fuller counterpart to the Analytics Dashboard's
 * "everything at once, briefly" grid. Reuses the exact same chart components and API calls; the
 * only thing this page adds is the report-type selector and an "Export this report" shortcut. */
@Component({
  selector: 'app-reports-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    Skeleton,
    MetricCard,
    TimeRangePicker,
    LineChart,
    BarChart,
    Heatmap,
  ],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.scss',
})
export class ReportsPage {
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly periodStore = inject(AnalyticsPeriodStore);

  protected readonly reportTypes = REPORT_TYPES;
  protected readonly reportTypeLabel = reportTypeLabel;
  protected readonly formatMinutes = formatMinutes;
  protected readonly moodTrendLabel = moodTrendLabel;

  protected readonly selectedType = signal<AnalyticsReportType>('PRODUCTIVITY');
  protected readonly loading = signal(true);

  // Only one of these is populated at a time, matching `selectedType` — kept as separate typed
  // signals (rather than one `unknown`-typed signal) so the template can bind each chart's own
  // response shape directly.
  protected readonly overview = signal<AnalyticsOverview | null>(null);
  protected readonly productivity = signal<ProductivityAnalytics | null>(null);
  protected readonly habits = signal<HabitsAnalytics | null>(null);
  protected readonly goals = signal<GoalsAnalytics | null>(null);
  protected readonly planner = signal<PlannerAnalytics | null>(null);
  protected readonly journal = signal<JournalAnalytics | null>(null);
  protected readonly calendar = signal<CalendarAnalytics | null>(null);

  constructor() {
    this.load();
  }

  protected onTypeChange(type: AnalyticsReportType): void {
    this.selectedType.set(type);
    this.load();
  }

  protected onPeriodChange(): void {
    this.load();
  }

  protected openExportDialog(): void {
    this.dialog.open(ExportDialog);
  }

  protected journalHeatmapCells(): HeatmapCell[] {
    const series = this.journal()?.series ?? [];
    return series.map((point) => ({ date: point.bucket, value: point.total ?? 0 }));
  }

  private load(): void {
    this.loading.set(true);
    const type = this.selectedType();
    const query = { period: this.periodStore.period() };
    const done = () => this.loading.set(false);

    switch (type) {
      case 'OVERVIEW':
        this.analyticsApi.getOverview().subscribe({
          next: (result) => {
            this.overview.set(result);
            done();
          },
          error: done,
        });
        break;
      case 'PRODUCTIVITY':
        this.analyticsApi.getProductivity(query).subscribe({
          next: (result) => {
            this.productivity.set(result);
            done();
          },
          error: done,
        });
        break;
      case 'HABITS':
        this.analyticsApi.getHabits(query).subscribe({
          next: (result) => {
            this.habits.set(result);
            done();
          },
          error: done,
        });
        break;
      case 'GOALS':
        this.analyticsApi.getGoals(query).subscribe({
          next: (result) => {
            this.goals.set(result);
            done();
          },
          error: done,
        });
        break;
      case 'PLANNER':
        this.analyticsApi.getPlanner(query).subscribe({
          next: (result) => {
            this.planner.set(result);
            done();
          },
          error: done,
        });
        break;
      case 'JOURNAL':
        this.analyticsApi.getJournal(query).subscribe({
          next: (result) => {
            this.journal.set(result);
            done();
          },
          error: done,
        });
        break;
      case 'CALENDAR':
        this.analyticsApi.getCalendar(query).subscribe({
          next: (result) => {
            this.calendar.set(result);
            done();
          },
          error: done,
        });
        break;
    }
  }
}
