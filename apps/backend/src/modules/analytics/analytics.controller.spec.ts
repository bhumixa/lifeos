import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsPeriod } from '../../../generated/prisma/index.js';
import { AnalyticsExportService } from './analytics-export.service.js';
import { AnalyticsSnapshotService } from './analytics-snapshot.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: {
    getOverviewEnrichment: jest.Mock;
    getProductivity: jest.Mock;
    getHabits: jest.Mock;
    getGoals: jest.Mock;
    getPlanner: jest.Mock;
    getJournal: jest.Mock;
    getCalendar: jest.Mock;
  };
  let snapshotService: { getOrCreateToday: jest.Mock };
  let exportService: { findAll: jest.Mock; create: jest.Mock };

  const user = { id: 'user-1', email: 'a@b.com', role: 'STANDARD' } as const;

  beforeEach(async () => {
    analyticsService = {
      getOverviewEnrichment: jest.fn().mockResolvedValue({
        activeInsightCount: 1,
        unreadNotificationCount: 2,
      }),
      getProductivity: jest
        .fn()
        .mockResolvedValue({ period: AnalyticsPeriod.WEEK }),
      getHabits: jest.fn().mockResolvedValue({ period: AnalyticsPeriod.WEEK }),
      getGoals: jest.fn().mockResolvedValue({ period: AnalyticsPeriod.WEEK }),
      getPlanner: jest.fn().mockResolvedValue({ period: AnalyticsPeriod.WEEK }),
      getJournal: jest.fn().mockResolvedValue({ period: AnalyticsPeriod.WEEK }),
      getCalendar: jest
        .fn()
        .mockResolvedValue({ period: AnalyticsPeriod.WEEK }),
    };
    snapshotService = {
      getOrCreateToday: jest
        .fn()
        .mockResolvedValue({ snapshotDate: '2026-07-05', cached: true }),
    };
    exportService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      create: jest.fn().mockResolvedValue({ id: 'export-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: AnalyticsSnapshotService, useValue: snapshotService },
        { provide: AnalyticsExportService, useValue: exportService },
      ],
    }).compile();

    controller = module.get(AnalyticsController);
  });

  it('GET /analytics/overview merges the cached snapshot with live enrichment', async () => {
    const result = await controller.getOverview(user);
    expect(result).toEqual({
      snapshotDate: '2026-07-05',
      cached: true,
      activeInsightCount: 1,
      unreadNotificationCount: 2,
    });
  });

  it('delegates each domain endpoint to AnalyticsService with the requested period', async () => {
    await controller.getProductivity(user, { period: AnalyticsPeriod.MONTH });
    expect(analyticsService.getProductivity).toHaveBeenCalledWith(
      user.id,
      AnalyticsPeriod.MONTH,
    );

    await controller.getHabits(user, { period: AnalyticsPeriod.WEEK });
    expect(analyticsService.getHabits).toHaveBeenCalledWith(
      user.id,
      AnalyticsPeriod.WEEK,
    );

    await controller.getGoals(user, { period: AnalyticsPeriod.YEAR });
    expect(analyticsService.getGoals).toHaveBeenCalledWith(
      user.id,
      AnalyticsPeriod.YEAR,
    );

    await controller.getPlanner(user, { period: AnalyticsPeriod.DAY });
    expect(analyticsService.getPlanner).toHaveBeenCalledWith(
      user.id,
      AnalyticsPeriod.DAY,
    );

    await controller.getJournal(user, { period: AnalyticsPeriod.WEEK });
    expect(analyticsService.getJournal).toHaveBeenCalledWith(
      user.id,
      AnalyticsPeriod.WEEK,
    );

    await controller.getCalendar(user, { period: AnalyticsPeriod.WEEK });
    expect(analyticsService.getCalendar).toHaveBeenCalledWith(
      user.id,
      AnalyticsPeriod.WEEK,
    );
  });

  it('GET /analytics/export delegates to AnalyticsExportService.findAll', async () => {
    const query = { page: 1, pageSize: 20 };
    await controller.getExports(user, query);
    expect(exportService.findAll).toHaveBeenCalledWith(user.id, query);
  });

  it('POST /analytics/export delegates to AnalyticsExportService.create', async () => {
    const dto = { type: 'PRODUCTIVITY' as const, format: 'CSV' as const };
    await controller.createExport(user, dto);
    expect(exportService.create).toHaveBeenCalledWith(user.id, dto);
  });
});
