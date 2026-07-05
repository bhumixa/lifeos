import { TestBed } from '@angular/core/testing';
import type { AiInsight } from '@lifeos/shared-types';
import { of } from 'rxjs';
import { AiApiService } from '../../ai/services/ai-api.service';
import { DashboardAiService } from './dashboard-ai.service';

describe('DashboardAiService', () => {
  let service: DashboardAiService;
  let aiApi: { listInsights: jasmine.Spy };

  function makeInsight(overrides: Partial<AiInsight>): AiInsight {
    return {
      id: 'insight-1',
      type: 'PRODUCTIVITY',
      title: 'Insight',
      summary: 'summary',
      content: 'content',
      confidence: 0.5,
      status: 'ACTIVE',
      sourceData: { flags: [] },
      generatedAt: '2026-07-05T08:00:00.000Z',
      expiresAt: '2026-07-06T08:00:00.000Z',
      createdAt: '2026-07-05T08:00:00.000Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    aiApi = { listInsights: jasmine.createSpy('listInsights') };
    TestBed.configureTestingModule({ providers: [{ provide: AiApiService, useValue: aiApi }] });
    service = TestBed.inject(DashboardAiService);
  });

  it('requests active insights with a bounded page size', () => {
    aiApi.listInsights.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));

    service.load().subscribe();

    expect(aiApi.listInsights).toHaveBeenCalledWith({ status: 'ACTIVE', pageSize: 20 });
  });

  it('picks the highest-confidence insight as the top recommendation', (done) => {
    const insights = [
      makeInsight({ id: 'a', confidence: 0.4 }),
      makeInsight({ id: 'b', confidence: 0.9 }),
      makeInsight({ id: 'c', confidence: 0.6 }),
    ];
    aiApi.listInsights.and.returnValue(of({ data: insights, meta: { page: 1, pageSize: 20, total: 3, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary.topRecommendation?.id).toBe('b');
      done();
    });
  });

  it('picks out the PRODUCTIVITY-type insight specifically for the trend widget', (done) => {
    const insights = [
      makeInsight({ id: 'a', type: 'HABITS' }),
      makeInsight({ id: 'b', type: 'PRODUCTIVITY' }),
    ];
    aiApi.listInsights.and.returnValue(of({ data: insights, meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary.productivityTrend?.id).toBe('b');
      done();
    });
  });

  it('filters risk alerts by sourceData.flags, not by type', (done) => {
    const insights = [
      makeInsight({ id: 'a', type: 'GOALS', sourceData: { flags: ['risk'] } }),
      makeInsight({ id: 'b', type: 'PLANNER', sourceData: { flags: [] } }),
      makeInsight({ id: 'c', type: 'JOURNAL', sourceData: { flags: ['risk'] } }),
    ];
    aiApi.listInsights.and.returnValue(of({ data: insights, meta: { page: 1, pageSize: 20, total: 3, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary.riskAlerts.map((insight) => insight.id)).toEqual(['a', 'c']);
      done();
    });
  });

  it('returns nulls/empties gracefully when there are no active insights', (done) => {
    aiApi.listInsights.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary).toEqual({
        activeInsightCount: 0,
        topRecommendation: null,
        productivityTrend: null,
        riskAlerts: [],
      });
      done();
    });
  });
});
