import { TestBed } from '@angular/core/testing';
import type { Calendar } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { CalendarApiService } from '../services/calendar-api.service';
import { CalendarStore } from './calendar-store';

describe('CalendarStore', () => {
  let store: CalendarStore;
  let calendarApi: {
    listCalendars: jasmine.Spy;
    createCalendar: jasmine.Spy;
    updateCalendar: jasmine.Spy;
    removeCalendar: jasmine.Spy;
    sync: jasmine.Spy;
  };

  function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
    return {
      id: 'calendar-1',
      name: 'Personal',
      provider: 'LOCAL',
      color: '#3F51B5',
      timezone: 'UTC',
      enabled: true,
      eventCount: 0,
      lastSyncedAt: null,
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    calendarApi = {
      listCalendars: jasmine.createSpy('listCalendars').and.returnValue(of([makeCalendar()])),
      createCalendar: jasmine.createSpy('createCalendar').and.returnValue(of(makeCalendar())),
      updateCalendar: jasmine.createSpy('updateCalendar').and.returnValue(of(makeCalendar())),
      removeCalendar: jasmine.createSpy('removeCalendar').and.returnValue(of(undefined)),
      sync: jasmine.createSpy('sync').and.returnValue(
        of({ id: 'sync-1', calendarId: 'calendar-1', lastSync: null, status: 'SUCCESS', errorMessage: null, createdAt: '' }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: CalendarApiService, useValue: calendarApi }],
    });

    store = TestBed.inject(CalendarStore);
  });

  it('starts empty and not loading', () => {
    expect(store.calendars()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('load() populates calendars on success', () => {
    store.load();

    expect(store.calendars()).toEqual([makeCalendar()]);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message on failure', () => {
    calendarApi.listCalendars.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.error()).toBe('Could not load calendars. Please try again.');
  });

  it('a newly loaded calendar is visible by default', () => {
    store.load();

    expect(store.isVisible('calendar-1')).toBe(true);
    expect(store.visibleCalendars()).toEqual([makeCalendar()]);
  });

  it('toggleVisibility hides, then re-shows, a calendar', () => {
    store.load();

    store.toggleVisibility('calendar-1');
    expect(store.isVisible('calendar-1')).toBe(false);
    expect(store.visibleCalendars()).toEqual([]);

    store.toggleVisibility('calendar-1');
    expect(store.isVisible('calendar-1')).toBe(true);
  });

  it('visibleCalendars excludes disabled calendars even if not explicitly hidden', () => {
    calendarApi.listCalendars.and.returnValue(of([makeCalendar({ enabled: false })]));

    store.load();

    expect(store.visibleCalendars()).toEqual([]);
  });

  it('create() delegates to CalendarApiService.createCalendar and reloads', () => {
    store.create({ name: 'Work', color: '#009688' }).subscribe();

    expect(calendarApi.createCalendar).toHaveBeenCalledWith({ name: 'Work', color: '#009688' });
    expect(calendarApi.listCalendars).toHaveBeenCalled();
  });

  it('remove() delegates to CalendarApiService.removeCalendar and reloads', () => {
    store.remove('calendar-1').subscribe();

    expect(calendarApi.removeCalendar).toHaveBeenCalledWith('calendar-1');
    expect(calendarApi.listCalendars).toHaveBeenCalled();
  });

  it('sync() delegates to CalendarApiService.sync and reloads', () => {
    store.sync('calendar-1').subscribe();

    expect(calendarApi.sync).toHaveBeenCalledWith({ calendarId: 'calendar-1' });
    expect(calendarApi.listCalendars).toHaveBeenCalled();
  });
});
