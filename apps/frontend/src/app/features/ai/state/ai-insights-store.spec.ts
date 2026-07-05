import { TestBed } from '@angular/core/testing';
import type { AiInsight } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { AiApiService } from '../services/ai-api.service';
import { AiInsightsStore } from './ai-insights-store';

describe('AiInsightsStore', () => {
  let store: AiInsightsStore;
  let api: {
    listInsights: jasmine.Spy;
    generateInsights: jasmine.Spy;
  };

  const mockInsight: AiInsight = {
    id: 'insight-1',
    type: 'PRODUCTIVITY',
    title: 'Weekly Productivity Trend',
    summary: 'Your completion rate dropped 12% this week.',
    content: 'Your completion rate dropped 12% this week.',
    confidence: 0.8,
    status: 'ACTIVE',
    sourceData: { flags: ['risk'] },
    generatedAt: '2026-07-05T08:00:00.000Z',
    expiresAt: '2026-07-06T08:00:00.000Z',
    createdAt: '2026-07-05T08:00:00.000Z',
  };

  const mockPage = { data: [mockInsight], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };

  beforeEach(() => {
    api = {
      listInsights: jasmine.createSpy('listInsights').and.returnValue(of(mockPage)),
      generateInsights: jasmine.createSpy('generateInsights').and.returnValue(of([mockInsight])),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AiApiService, useValue: api }],
    });

    store = TestBed.inject(AiInsightsStore);
  });

  it('starts empty and not loading', () => {
    expect(store.insights()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.isEmpty()).toBe(true);
  });

  it('load() populates insights and meta on success', () => {
    store.load();

    expect(store.insights()).toEqual([mockInsight]);
    expect(store.meta()).toEqual(mockPage.meta);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message on failure', () => {
    api.listInsights.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.error()).toBe('Could not load insights. Please try again.');
  });

  it('setQuery() resets to page 1 on a non-page filter change', () => {
    store.setQuery({ page: 3 });
    store.setQuery({ type: 'GOALS' });

    expect(store.query().page).toBe(1);
    expect(store.query().type).toBe('GOALS');
  });

  it('setQuery() preserves the requested page on a pure page change', () => {
    store.setQuery({ page: 2 });
    expect(store.query().page).toBe(2);
  });

  it('generate() calls the generate endpoint and reloads the list afterward', () => {
    store.generate({ type: 'HABITS' });

    expect(api.generateInsights).toHaveBeenCalledWith({ type: 'HABITS' });
    expect(api.listInsights).toHaveBeenCalled();
    expect(store.generating()).toBe(false);
  });

  it('generate() sets an error message on failure without crashing', () => {
    api.generateInsights.and.returnValue(throwError(() => new Error('boom')));

    store.generate();

    expect(store.error()).toBe('Could not generate insights. Please try again.');
    expect(store.generating()).toBe(false);
  });
});
