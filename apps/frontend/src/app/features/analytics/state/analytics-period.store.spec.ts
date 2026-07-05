import { TestBed } from '@angular/core/testing';
import { AnalyticsPeriodStore } from './analytics-period.store';

describe('AnalyticsPeriodStore', () => {
  let store: AnalyticsPeriodStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AnalyticsPeriodStore);
  });

  it('defaults to WEEK', () => {
    expect(store.period()).toBe('WEEK');
  });

  it('setPeriod updates the readonly signal', () => {
    store.setPeriod('YEAR');
    expect(store.period()).toBe('YEAR');
  });
});
