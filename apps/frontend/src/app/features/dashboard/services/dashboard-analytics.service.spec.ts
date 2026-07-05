import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsApiService } from '../../analytics/services/analytics-api.service';
import { DashboardAnalyticsService } from './dashboard-analytics.service';

describe('DashboardAnalyticsService', () => {
  let service: DashboardAnalyticsService;
  let analyticsApi: {
    getProductivity: jasmine.Spy;
    getPlanner: jasmine.Spy;
    getHabits: jasmine.Spy;
    getJournal: jasmine.Spy;
  };

  beforeEach(() => {
    analyticsApi = {
      getProductivity: jasmine.createSpy('getProductivity'),
      getPlanner: jasmine.createSpy('getPlanner'),
      getHabits: jasmine.createSpy('getHabits'),
      getJournal: jasmine.createSpy('getJournal'),
    };
    TestBed.configureTestingModule({ providers: [{ provide: AnalyticsApiService, useValue: analyticsApi }] });
    service = TestBed.inject(DashboardAnalyticsService);
  });

  it('requests all four domains at WEEK period and derives the four Dashboard trend widgets', (done) => {
    analyticsApi.getProductivity.and.returnValue(
      of({
        period: 'WEEK',
        from: '2026-06-29',
        to: '2026-07-05',
        series: [{ bucket: '2026-07-05', value: 3, total: 5 }],
        summary: { averageCompletionRate: 60, deltaPercent: 8, bestWeekdays: ['Monday'] },
      }),
    );
    analyticsApi.getPlanner.and.returnValue(
      of({
        period: 'WEEK',
        from: '2026-06-29',
        to: '2026-07-05',
        series: [{ bucket: '2026-07-05', value: 30, total: 60 }],
        summary: { averageUtilizationRate: 50, totalFocusMinutes: 90, totalBlocksCompleted: 4 },
      }),
    );
    analyticsApi.getHabits.and.returnValue(
      of({
        period: 'WEEK',
        from: '2026-06-29',
        to: '2026-07-05',
        series: [{ bucket: '2026-07-05', value: 2, total: 2 }],
        summary: { averageCompletionRate: 100, totalActiveHabits: 2, totalLogs: 14 },
      }),
    );
    analyticsApi.getJournal.and.returnValue(
      of({
        period: 'WEEK',
        from: '2026-06-29',
        to: '2026-07-05',
        series: [{ bucket: '2026-07-05', value: 4.5, total: 1 }],
        summary: {
          consistencyRate: 71,
          moodTrendDirection: 'IMPROVING',
          moodTrendConsecutiveDays: 3,
          averageMoodScore: 4.5,
        },
      }),
    );

    service.load().subscribe((summary) => {
      expect(analyticsApi.getProductivity).toHaveBeenCalledWith({ period: 'WEEK' });
      expect(analyticsApi.getPlanner).toHaveBeenCalledWith({ period: 'WEEK' });
      expect(analyticsApi.getHabits).toHaveBeenCalledWith({ period: 'WEEK' });
      expect(analyticsApi.getJournal).toHaveBeenCalledWith({ period: 'WEEK' });

      expect(summary.weeklyProductivity).toEqual({
        averageCompletionRate: 60,
        deltaPercent: 8,
        series: [{ bucket: '2026-07-05', value: 3, total: 5 }],
      });
      expect(summary.focusTrend.totalMinutes).toBe(90);
      expect(summary.habitTrend.averageCompletionRate).toBe(100);
      expect(summary.moodTrend.direction).toBe('IMPROVING');
      expect(summary.moodTrend.averageMoodScore).toBe(4.5);
      done();
    });
  });
});
