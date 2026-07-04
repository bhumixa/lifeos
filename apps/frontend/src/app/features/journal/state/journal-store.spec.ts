import { TestBed } from '@angular/core/testing';
import type { JournalEntry } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { JournalApiService } from '../services/journal-api.service';
import { JournalStore } from './journal-store';

describe('JournalStore', () => {
  let store: JournalStore;
  let journalApi: {
    history: jasmine.Spy;
    remove: jasmine.Spy;
  };

  const mockEntry: JournalEntry = {
    id: 'entry-1',
    date: '2026-07-04',
    type: 'FREEFORM',
    title: null,
    content: 'A normal day.',
    mood: null,
    energy: null,
    productivity: null,
    gratitude: [],
    wins: [],
    lessons: null,
    tomorrowPlan: null,
    tags: [],
    weather: null,
    location: null,
    intention: null,
    topPriorities: [],
    affirmation: null,
    visualization: null,
    expectedChallenges: null,
    wentWell: null,
    wentWrong: null,
    plannerReflection: null,
    habitReflection: null,
    goalReflection: null,
    goalId: null,
    plannerDayId: null,
    attachments: [],
    createdAt: '2026-07-04T08:00:00.000Z',
    updatedAt: '2026-07-04T08:00:00.000Z',
  };

  const mockPage = { data: [mockEntry], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };

  beforeEach(() => {
    journalApi = {
      history: jasmine.createSpy('history').and.returnValue(of(mockPage)),
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: JournalApiService, useValue: journalApi }],
    });

    store = TestBed.inject(JournalStore);
  });

  it('starts empty and not loading', () => {
    expect(store.entries()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('load() populates entries and meta on success', () => {
    store.load();

    expect(store.entries()).toEqual([mockEntry]);
    expect(store.meta()).toEqual(mockPage.meta);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message on failure', () => {
    journalApi.history.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.error()).toBe('Could not load journal history. Please try again.');
  });

  it('isEmpty is true only once loaded with zero results and no error', () => {
    journalApi.history.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));

    store.load();

    expect(store.isEmpty()).toBe(true);
  });

  it('setQuery(patch) resets page to 1 for a non-page change', () => {
    store.setQuery({ page: 3 });
    journalApi.history.calls.reset();

    store.setQuery({ type: 'MORNING' });

    expect(store.query().page).toBe(1);
    expect(store.query().type).toBe('MORNING');
    expect(journalApi.history).toHaveBeenCalled();
  });

  it('setQuery(patch) keeps the given page for a page-only change', () => {
    store.setQuery({ page: 3 });

    expect(store.query().page).toBe(3);
  });

  it('resetFilters() restores the default query and reloads', () => {
    store.setQuery({ type: 'EVENING', page: 2 });

    store.resetFilters();

    expect(store.query()).toEqual({ page: 1, pageSize: 20 });
  });

  it('removeEntry() calls the API and reloads the list', () => {
    store.removeEntry('entry-1').subscribe();

    expect(journalApi.remove).toHaveBeenCalledWith('entry-1');
    expect(journalApi.history).toHaveBeenCalled();
  });
});
