import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { CalendarApiService } from './calendar-api.service';

describe('CalendarApiService', () => {
  let service: CalendarApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/calendar`;

  const mockCalendar: Calendar = {
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
  };

  const mockEvent: CalendarEvent = {
    id: 'event-1',
    calendarId: 'calendar-1',
    plannerBlockId: null,
    taskId: null,
    goalId: null,
    journalEntryId: null,
    externalId: null,
    title: 'Dentist',
    description: null,
    startTime: '2026-07-06T14:00:00.000Z',
    endTime: '2026-07-06T15:00:00.000Z',
    allDay: false,
    location: null,
    source: 'LOCAL',
    status: 'ACTIVE',
    conflictsWith: [],
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CalendarApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listCalendars() requests the base calendar URL with query params', () => {
    service.listCalendars({ provider: 'LOCAL' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === baseUrl);
    expect(req.request.params.get('provider')).toBe('LOCAL');
    req.flush([mockCalendar]);
  });

  it('getCalendar() requests the specific calendar', () => {
    service.getCalendar('calendar-1').subscribe((calendar) => expect(calendar.id).toBe('calendar-1'));
    const req = httpMock.expectOne(`${baseUrl}/calendar-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCalendar);
  });

  it('createCalendar() POSTs to the base calendar URL', () => {
    service.createCalendar({ name: 'Work', color: '#009688' }).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Work', color: '#009688' });
    req.flush(mockCalendar);
  });

  it('updateCalendar() PATCHes the specific calendar', () => {
    service.updateCalendar('calendar-1', { name: 'Renamed' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/calendar-1`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockCalendar);
  });

  it('removeCalendar() DELETEs the specific calendar', () => {
    service.removeCalendar('calendar-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/calendar-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('listEvents() requests GET /calendar/events with a date range', () => {
    service.listEvents({ from: '2026-07-01T00:00:00.000Z', to: '2026-07-31T23:59:59.000Z' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/events`);
    expect(req.request.params.get('from')).toBe('2026-07-01T00:00:00.000Z');
    expect(req.request.params.get('to')).toBe('2026-07-31T23:59:59.000Z');
    req.flush({ data: [mockEvent], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
  });

  it('getEvent() requests the specific event', () => {
    service.getEvent('event-1').subscribe((event) => expect(event.id).toBe('event-1'));
    const req = httpMock.expectOne(`${baseUrl}/events/event-1`);
    req.flush(mockEvent);
  });

  it('createEvent() POSTs to /calendar/events', () => {
    service
      .createEvent({
        calendarId: 'calendar-1',
        title: 'Dentist',
        startTime: '2026-07-06T14:00:00.000Z',
        endTime: '2026-07-06T15:00:00.000Z',
      })
      .subscribe();
    const req = httpMock.expectOne(`${baseUrl}/events`);
    expect(req.request.method).toBe('POST');
    req.flush(mockEvent);
  });

  it('updateEvent() PATCHes the specific event', () => {
    service.updateEvent('event-1', { title: 'New title' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/events/event-1`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockEvent);
  });

  it('removeEvent() DELETEs the specific event', () => {
    service.removeEvent('event-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/events/event-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('sync() POSTs to /calendar/sync', () => {
    service.sync({ calendarId: 'calendar-1' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/sync`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ calendarId: 'calendar-1' });
    req.flush({
      id: 'sync-1',
      calendarId: 'calendar-1',
      lastSync: '2026-07-04T00:00:00.000Z',
      status: 'SUCCESS',
      errorMessage: null,
      createdAt: '2026-07-04T00:00:00.000Z',
    });
  });
});
