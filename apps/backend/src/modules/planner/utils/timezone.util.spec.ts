import {
  addDaysToDateString,
  addMinutes,
  diffMinutes,
  formatDateOnly,
  getZonedDateString,
  parseDateOnly,
  zonedWallTimeToUtc,
} from './timezone.util.js';

describe('zonedWallTimeToUtc', () => {
  // America/New_York is EST (UTC-5) in January/most of March, EDT (UTC-4) from the second Sunday
  // of March through the first Sunday of November. 2026's transitions: spring-forward March 8
  // (02:00 -> 03:00), fall-back November 1 (02:00 -> 01:00).
  it('uses the standard-time offset outside DST', () => {
    expect(
      zonedWallTimeToUtc(
        '2026-01-15',
        '09:00',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-01-15T14:00:00.000Z');
  });

  it('uses the daylight-time offset inside DST', () => {
    expect(
      zonedWallTimeToUtc(
        '2026-07-03',
        '09:00',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-07-03T13:00:00.000Z');
  });

  it('resolves correctly for a time before the spring-forward transition', () => {
    // 01:00 on transition day is still EST — the clock hasn't jumped yet.
    expect(
      zonedWallTimeToUtc(
        '2026-03-08',
        '01:00',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-03-08T06:00:00.000Z');
  });

  it('resolves correctly for a time after the spring-forward transition', () => {
    // By 09:00 the clock has already jumped to EDT.
    expect(
      zonedWallTimeToUtc(
        '2026-03-08',
        '09:00',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-03-08T13:00:00.000Z');
  });

  it('resolves correctly for a time before the fall-back transition', () => {
    expect(
      zonedWallTimeToUtc(
        '2026-10-31',
        '09:00',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-10-31T13:00:00.000Z');
  });

  it('resolves correctly for a time after the fall-back transition', () => {
    expect(
      zonedWallTimeToUtc(
        '2026-11-01',
        '09:00',
        'America/New_York',
      ).toISOString(),
    ).toBe('2026-11-01T14:00:00.000Z');
  });

  it('handles a fixed-offset zone with no DST', () => {
    // Asia/Kolkata is UTC+5:30 year-round.
    expect(
      zonedWallTimeToUtc('2026-07-03', '09:00', 'Asia/Kolkata').toISOString(),
    ).toBe('2026-07-03T03:30:00.000Z');
  });

  it('is a no-op offset for UTC itself', () => {
    expect(zonedWallTimeToUtc('2026-07-03', '09:00', 'UTC').toISOString()).toBe(
      '2026-07-03T09:00:00.000Z',
    );
  });
});

describe('getZonedDateString', () => {
  it('reads the same instant as different calendar dates in different zones', () => {
    const instant = new Date('2026-07-03T20:00:00.000Z');

    expect(getZonedDateString(instant, 'UTC')).toBe('2026-07-03');
    // UTC+5:30 — 20:00 UTC is already 01:30 the next day.
    expect(getZonedDateString(instant, 'Asia/Kolkata')).toBe('2026-07-04');
    // UTC-7 (PDT) — 20:00 UTC is still 13:00 the same day.
    expect(getZonedDateString(instant, 'America/Los_Angeles')).toBe(
      '2026-07-03',
    );
  });
});

describe('parseDateOnly / formatDateOnly', () => {
  it('round-trips a date string through UTC-midnight representation', () => {
    const date = parseDateOnly('2026-07-03');
    expect(date.toISOString()).toBe('2026-07-03T00:00:00.000Z');
    expect(formatDateOnly(date)).toBe('2026-07-03');
  });
});

describe('addDaysToDateString', () => {
  it('rolls over the month boundary', () => {
    expect(addDaysToDateString('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('rolls over a non-leap-year February', () => {
    expect(addDaysToDateString('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('rolls over the year boundary', () => {
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('addMinutes / diffMinutes', () => {
  it('adds minutes without mutating the original Date', () => {
    const start = new Date('2026-07-03T09:00:00.000Z');
    const end = addMinutes(start, 90);

    expect(end.toISOString()).toBe('2026-07-03T10:30:00.000Z');
    expect(start.toISOString()).toBe('2026-07-03T09:00:00.000Z');
  });

  it('computes whole minutes between two instants', () => {
    const start = new Date('2026-07-03T09:00:00.000Z');
    const end = new Date('2026-07-03T10:30:00.000Z');
    expect(diffMinutes(start, end)).toBe(90);
  });
});
