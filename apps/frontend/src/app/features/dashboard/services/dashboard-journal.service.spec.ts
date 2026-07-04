import { TestBed } from '@angular/core/testing';
import type { JournalEntry } from '@lifeos/shared-types';
import { of } from 'rxjs';
import { JournalApiService } from '../../journal/services/journal-api.service';
import { DashboardJournalService } from './dashboard-journal.service';

describe('DashboardJournalService', () => {
  let service: DashboardJournalService;
  let journalApi: { getByDate: jasmine.Spy; history: jasmine.Spy };

  function makeEntry(overrides: Partial<JournalEntry>): JournalEntry {
    return {
      id: 'entry-1',
      date: '2026-07-04',
      type: 'FREEFORM',
      title: null,
      content: null,
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
      ...overrides,
    };
  }

  beforeEach(() => {
    journalApi = {
      getByDate: jasmine.createSpy('getByDate'),
      history: jasmine.createSpy('history'),
    };
    TestBed.configureTestingModule({ providers: [{ provide: JournalApiService, useValue: journalApi }] });
    service = TestBed.inject(DashboardJournalService);
  });

  it('reports hasMorningToday/hasEveningToday from today\'s own entries', (done) => {
    journalApi.getByDate.and.returnValue(
      of({ date: '2026-07-04', entries: [makeEntry({ id: 'm1', type: 'MORNING' })] }),
    );
    journalApi.history.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 1, total: 0, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary.hasMorningToday).toBe(true);
      expect(summary.hasEveningToday).toBe(false);
      done();
    });
  });

  it('reads currentMood and latestReflection from the most recent entry overall', (done) => {
    journalApi.getByDate.and.returnValue(of({ date: '2026-07-04', entries: [] }));
    journalApi.history.and.returnValue(
      of({
        data: [makeEntry({ id: 'latest', title: 'A good day', mood: 'GOOD', content: 'Felt productive.' })],
        meta: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
      }),
    );

    service.load().subscribe((summary) => {
      expect(summary.currentMood).toBe('GOOD');
      expect(summary.latestReflection).toEqual({ headline: 'A good day', preview: 'Felt productive.' });
      done();
    });
  });

  it('prefers a gratitude entry from today over the latest overall entry', (done) => {
    journalApi.getByDate.and.returnValue(
      of({
        date: '2026-07-04',
        entries: [makeEntry({ id: 'evening', type: 'EVENING', gratitude: ['My health'] })],
      }),
    );
    journalApi.history.and.returnValue(
      of({ data: [makeEntry({ id: 'latest', gratitude: [] })], meta: { page: 1, pageSize: 1, total: 1, totalPages: 1 } }),
    );

    service.load().subscribe((summary) => {
      expect(summary.lastGratitude).toBe('My health');
      done();
    });
  });

  it('returns null fields when there is no journal history at all', (done) => {
    journalApi.getByDate.and.returnValue(of({ date: '2026-07-04', entries: [] }));
    journalApi.history.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 1, total: 0, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary).toEqual({
        hasMorningToday: false,
        hasEveningToday: false,
        currentMood: null,
        lastGratitude: null,
        latestReflection: null,
      });
      done();
    });
  });
});
