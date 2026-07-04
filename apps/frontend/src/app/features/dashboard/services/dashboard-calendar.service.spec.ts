import { TestBed } from '@angular/core/testing';
import type { Calendar, CalendarEvent, PaginatedCalendarEvents, PlannerBlock, PlannerDay } from '@lifeos/shared-types';
import { of } from 'rxjs';
import { PlannerApiService } from '../../planner/services/planner-api.service';
import { CalendarApiService } from '../../calendar/services/calendar-api.service';
import { DashboardCalendarService } from './dashboard-calendar.service';

function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: 'calendar-1',
    name: 'Personal',
    provider: 'LOCAL',
    color: '#3F51B5',
    timezone: 'UTC',
    enabled: true,
    eventCount: 1,
    lastSyncedAt: null,
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    calendarId: 'calendar-1',
    plannerBlockId: null,
    taskId: null,
    goalId: null,
    journalEntryId: null,
    externalId: null,
    title: 'Dentist',
    description: null,
    startTime: '2026-07-04T14:00:00.000Z',
    endTime: '2026-07-04T15:00:00.000Z',
    allDay: false,
    location: null,
    source: 'LOCAL',
    status: 'ACTIVE',
    conflictsWith: [],
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z',
    ...overrides,
  };
}

function makePage(events: CalendarEvent[]): PaginatedCalendarEvents {
  return { data: events, meta: { page: 1, pageSize: 100, total: events.length, totalPages: 1 } };
}

function makeBlock(overrides: Partial<PlannerBlock> = {}): PlannerBlock {
  return {
    id: 'block-1',
    plannerDayId: 'day-1',
    type: 'TASK',
    referenceId: null,
    title: 'Deep work',
    description: null,
    startTime: '2026-07-04T09:00:00.000Z',
    endTime: '2026-07-04T10:00:00.000Z',
    duration: 60,
    color: null,
    completed: false,
    order: 0,
    goalId: null,
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z',
    ...overrides,
  };
}

function makePlannerDay(blocks: PlannerBlock[] = []): PlannerDay {
  return { id: 'day-1', date: '2026-07-04', notes: null, blocks, createdAt: '', updatedAt: '' };
}

describe('DashboardCalendarService', () => {
  let service: DashboardCalendarService;
  let calendarApi: { listCalendars: jasmine.Spy; listEvents: jasmine.Spy };
  let plannerApi: { today: jasmine.Spy };

  beforeEach(() => {
    calendarApi = {
      listCalendars: jasmine.createSpy('listCalendars').and.returnValue(of([makeCalendar()])),
      listEvents: jasmine.createSpy('listEvents').and.returnValue(of(makePage([]))),
    };
    plannerApi = { today: jasmine.createSpy('today').and.returnValue(of(makePlannerDay())) };

    TestBed.configureTestingModule({
      providers: [
        { provide: CalendarApiService, useValue: calendarApi },
        { provide: PlannerApiService, useValue: plannerApi },
      ],
    });

    service = TestBed.inject(DashboardCalendarService);
  });

  it('reports calendar counts from GET /calendar', (done) => {
    calendarApi.listCalendars.and.returnValue(
      of([makeCalendar({ id: 'a', enabled: true }), makeCalendar({ id: 'b', enabled: false })]),
    );

    service.load().subscribe((summary) => {
      expect(summary.calendarCount).toBe(2);
      expect(summary.enabledCalendarCount).toBe(1);
      done();
    });
  });

  it('reports todayEventsCount/upcomingEventsCount from the two GET /calendar/events calls', (done) => {
    calendarApi.listEvents.and.returnValues(of(makePage([makeEvent(), makeEvent({ id: 'e2' })])), of(makePage([makeEvent({ id: 'e3' })])));

    service.load().subscribe((summary) => {
      expect(summary.todayEventsCount).toBe(2);
      expect(summary.upcomingEventsCount).toBe(1);
      done();
    });
  });

  it('reuses GET /planner/today (not a new endpoint) for the planner half of Today\'s Schedule', (done) => {
    plannerApi.today.and.returnValue(of(makePlannerDay([makeBlock({ id: 'p1', startTime: '2026-07-04T08:00:00.000Z' })])));

    service.load().subscribe((summary) => {
      expect(plannerApi.today).toHaveBeenCalled();
      expect(summary.todaySchedule.some((item) => item.id === 'planner-p1' && item.source === 'planner')).toBe(true);
      done();
    });
  });

  it('merges planner blocks and calendar events into one chronologically sorted schedule', (done) => {
    plannerApi.today.and.returnValue(of(makePlannerDay([makeBlock({ id: 'p1', startTime: '2026-07-04T10:00:00.000Z' })])));
    calendarApi.listEvents.and.returnValues(
      of(makePage([makeEvent({ id: 'e1', startTime: '2026-07-04T08:00:00.000Z' })])),
      of(makePage([])),
    );

    service.load().subscribe((summary) => {
      expect(summary.todaySchedule.map((item) => item.id)).toEqual(['calendar-e1', 'planner-p1']);
      done();
    });
  });
});
