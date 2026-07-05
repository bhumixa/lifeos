import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsPeriod } from '../../../generated/prisma/index.js';
import { AnalyticsSnapshotService } from './analytics-snapshot.service.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsReportService } from './analytics-report.service.js';

describe('AnalyticsReportService', () => {
  let service: AnalyticsReportService;
  let analytics: {
    getProductivity: jest.Mock;
    getOverviewEnrichment: jest.Mock;
  };
  let snapshots: { getOrCreateToday: jest.Mock };

  const userId = 'user-1';

  beforeEach(async () => {
    analytics = {
      getProductivity: jest.fn().mockResolvedValue({
        period: AnalyticsPeriod.WEEK,
        from: '2026-06-29',
        to: '2026-07-05',
        series: [{ bucket: '2026-07-05', value: 3, total: 5 }],
        summary: {
          averageCompletionRate: 60,
          deltaPercent: 10,
          bestWeekdays: ['Monday'],
        },
      }),
      getOverviewEnrichment: jest.fn().mockResolvedValue({
        activeInsightCount: 2,
        unreadNotificationCount: 1,
      }),
    };
    snapshots = {
      getOrCreateToday: jest.fn().mockResolvedValue({
        snapshotDate: '2026-07-05',
        productivityScore: 70,
        habitScore: 60,
        plannerScore: 80,
        goalScore: 50,
        journalScore: 40,
        focusMinutes: 90,
        streakDays: 3,
        cached: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsReportService,
        { provide: AnalyticsService, useValue: analytics },
        { provide: AnalyticsSnapshotService, useValue: snapshots },
      ],
    }).compile();

    service = module.get(AnalyticsReportService);
  });

  it('builds a flat, format-agnostic report for a series-based domain', async () => {
    const report = await service.buildReport(
      userId,
      'PRODUCTIVITY',
      AnalyticsPeriod.WEEK,
    );

    expect(report.title).toBe('Productivity Report');
    expect(report.headers).toEqual(['Bucket', 'Value', 'Total']);
    expect(report.rows).toEqual([['2026-07-05', 3, 5]]);
    expect(report.period).toBe('WEEK (2026-06-29 to 2026-07-05)');
    expect(analytics.getProductivity).toHaveBeenCalledWith(
      userId,
      AnalyticsPeriod.WEEK,
    );
  });

  it('builds the OVERVIEW report from the cached snapshot plus live enrichment, with no period field', async () => {
    const report = await service.buildReport(userId, 'OVERVIEW');

    expect(report.title).toBe('Overview Report');
    expect(report.period).toBeUndefined();
    expect(report.rows).toContainEqual(['Productivity Score', 70]);
    expect(report.rows).toContainEqual(['Active Insights', 2]);
    expect(snapshots.getOrCreateToday).toHaveBeenCalledWith(userId);
  });
});
