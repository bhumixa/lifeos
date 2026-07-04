import type { CalendarEvent } from '@lifeos/shared-types';
import {
  addDaysToLocalDateString,
  formatEventTimeRange,
  groupEventsByDate,
  monthGridDates,
  toLocalDateString,
  weekDatesContaining,
} from './calendar-display';

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
    startTime: '2026-07-06T14:00:00.000Z',
    endTime: '2026-07-06T15:00:00.000Z',
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

describe('toLocalDateString / addDaysToLocalDateString', () => {
  it('formats a Date using its local calendar date, not a UTC-shifted one', () => {
    expect(toLocalDateString(new Date(2026, 6, 6))).toBe('2026-07-06');
  });

  it('adds days across a month boundary', () => {
    expect(addDaysToLocalDateString('2026-07-31', 1)).toBe('2026-08-01');
  });

  it('subtracts days across a year boundary', () => {
    expect(addDaysToLocalDateString('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('weekDatesContaining', () => {
  it('returns a Monday-start week of 7 dates', () => {
    // 2026-07-06 is a Monday.
    const week = weekDatesContaining('2026-07-08');
    expect(week).toEqual([
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
    ]);
  });
});

describe('monthGridDates', () => {
  it('fills leading/trailing days so the grid is a whole number of weeks', () => {
    const dates = monthGridDates('2026-07-15');
    expect(dates.length % 7).toBe(0);
    expect(dates).toContain('2026-07-01');
    expect(dates).toContain('2026-07-31');
  });
});

describe('groupEventsByDate', () => {
  it('buckets events by their local start date', () => {
    const grouped = groupEventsByDate([
      makeEvent({ id: 'a', startTime: '2026-07-06T09:00:00.000Z' }),
      makeEvent({ id: 'b', startTime: '2026-07-06T18:00:00.000Z' }),
      makeEvent({ id: 'c', startTime: '2026-07-07T09:00:00.000Z' }),
    ]);

    expect(grouped.get('2026-07-06')?.map((e) => e.id)).toEqual(['a', 'b']);
    expect(grouped.get('2026-07-07')?.map((e) => e.id)).toEqual(['c']);
  });
});

describe('formatEventTimeRange', () => {
  it('returns "All day" for an all-day event regardless of its stored times', () => {
    expect(formatEventTimeRange(makeEvent({ allDay: true }))).toBe('All day');
  });

  it('returns a start-end range for a timed event', () => {
    const label = formatEventTimeRange(makeEvent());
    expect(label).toContain('–');
  });
});
