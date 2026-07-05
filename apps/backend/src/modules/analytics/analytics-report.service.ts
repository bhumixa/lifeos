import { Injectable } from '@nestjs/common';
import { AnalyticsPeriod } from '../../../generated/prisma/index.js';
import { AnalyticsSnapshotService } from './analytics-snapshot.service.js';
import { AnalyticsService } from './analytics.service.js';
import type { AnalyticsReportType } from './dto/create-analytics-export.dto.js';
import type { AnalyticsTimeSeriesPointDto } from './dto/analytics-response.dto.js';

export interface AnalyticsReportData {
  title: string;
  generatedAt: Date;
  /** Omitted for OVERVIEW, which has no period/window of its own. */
  period?: string;
  headers: string[];
  rows: (string | number)[][];
  summary: Record<string, unknown>;
}

interface SeriesReportSource {
  from: string;
  to: string;
  series: AnalyticsTimeSeriesPointDto[];
  // `object`, not `Record<string, unknown>` — every domain's own summary DTO (ProductivitySummaryDto,
  // HabitsSummaryDto, etc.) is a concrete class without a string index signature, so it's only
  // structurally assignable to the wider `object`; buildSeriesReport spreads it into a fresh object
  // literal (which does satisfy Record<string, unknown>) when building AnalyticsReportData below.
  summary: object;
}

/**
 * Flattens AnalyticsService's own typed, per-domain responses into one generic
 * `{ headers, rows, summary }` shape any export format (CSV/JSON/PDF) can encode without knowing
 * which domain it came from — AnalyticsExportService's only collaborator besides
 * ExportGeneratorRegistry. Strictly read-only, like AnalyticsService itself: this class never
 * writes anything (AnalyticsExportService is the one that persists an AnalyticsExport row, once
 * this class has handed it a report to encode).
 */
@Injectable()
export class AnalyticsReportService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly snapshots: AnalyticsSnapshotService,
  ) {}

  async buildReport(
    userId: string,
    type: AnalyticsReportType,
    period: AnalyticsPeriod = AnalyticsPeriod.WEEK,
  ): Promise<AnalyticsReportData> {
    switch (type) {
      case 'OVERVIEW':
        return this.buildOverviewReport(userId);
      case 'PRODUCTIVITY':
        return this.buildSeriesReport(
          'Productivity Report',
          period,
          await this.analytics.getProductivity(userId, period),
        );
      case 'HABITS':
        return this.buildSeriesReport(
          'Habits Report',
          period,
          await this.analytics.getHabits(userId, period),
        );
      case 'GOALS':
        return this.buildSeriesReport(
          'Goals Report',
          period,
          await this.analytics.getGoals(userId, period),
        );
      case 'PLANNER':
        return this.buildSeriesReport(
          'Planner Report',
          period,
          await this.analytics.getPlanner(userId, period),
        );
      case 'JOURNAL':
        return this.buildSeriesReport(
          'Journal Report',
          period,
          await this.analytics.getJournal(userId, period),
        );
      case 'CALENDAR':
        return this.buildSeriesReport(
          'Calendar Report',
          period,
          await this.analytics.getCalendar(userId, period),
        );
    }
  }

  private async buildOverviewReport(
    userId: string,
  ): Promise<AnalyticsReportData> {
    const [snapshot, enrichment] = await Promise.all([
      this.snapshots.getOrCreateToday(userId),
      this.analytics.getOverviewEnrichment(userId),
    ]);

    return {
      title: 'Overview Report',
      generatedAt: new Date(),
      headers: ['Metric', 'Value'],
      rows: [
        ['Snapshot Date', snapshot.snapshotDate],
        ['Productivity Score', snapshot.productivityScore],
        ['Habit Score', snapshot.habitScore],
        ['Planner Score', snapshot.plannerScore],
        ['Goal Score', snapshot.goalScore],
        ['Journal Score', snapshot.journalScore],
        ['Focus Minutes', snapshot.focusMinutes],
        ['Streak Days', snapshot.streakDays],
        ['Active Insights', enrichment.activeInsightCount],
        ['Unread Notifications', enrichment.unreadNotificationCount],
      ],
      summary: { ...snapshot, ...enrichment },
    };
  }

  private buildSeriesReport(
    title: string,
    period: AnalyticsPeriod,
    data: SeriesReportSource,
  ): AnalyticsReportData {
    return {
      title,
      generatedAt: new Date(),
      period: `${period} (${data.from} to ${data.to})`,
      headers: ['Bucket', 'Value', 'Total'],
      rows: data.series.map((point) => [
        point.bucket,
        point.value,
        point.total ?? '',
      ]),
      summary: { ...data.summary },
    };
  }
}
