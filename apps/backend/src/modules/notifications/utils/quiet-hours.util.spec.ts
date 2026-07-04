import { computeScheduledFor, isWithinQuietHours } from './quiet-hours.util.js';

describe('isWithinQuietHours', () => {
  it('treats an equal start/end pair as disabled (never quiet)', () => {
    expect(isWithinQuietHours(23 * 60, 22 * 60, 22 * 60)).toBe(false);
  });

  it('handles a same-day window (start < end)', () => {
    const start = 13 * 60; // 13:00
    const end = 14 * 60; // 14:00
    expect(isWithinQuietHours(13 * 60, start, end)).toBe(true);
    expect(isWithinQuietHours(13 * 60 + 30, start, end)).toBe(true);
    expect(isWithinQuietHours(14 * 60, start, end)).toBe(false); // end is exclusive
    expect(isWithinQuietHours(12 * 60 + 59, start, end)).toBe(false);
  });

  it('handles an overnight window that wraps midnight (start > end)', () => {
    const start = 22 * 60; // 22:00
    const end = 7 * 60; // 07:00
    expect(isWithinQuietHours(22 * 60, start, end)).toBe(true); // right at start
    expect(isWithinQuietHours(23 * 60 + 30, start, end)).toBe(true); // late evening
    expect(isWithinQuietHours(0, start, end)).toBe(true); // midnight
    expect(isWithinQuietHours(6 * 60 + 59, start, end)).toBe(true); // just before end
    expect(isWithinQuietHours(7 * 60, start, end)).toBe(false); // end is exclusive
    expect(isWithinQuietHours(12 * 60, start, end)).toBe(false); // midday
  });
});

describe('computeScheduledFor', () => {
  it('returns the requested instant unchanged when quiet hours are off (either bound null)', () => {
    const requestedAt = new Date('2026-07-15T23:30:00.000Z');
    expect(computeScheduledFor(requestedAt, 'UTC', null, '07:00')).toBe(
      requestedAt,
    );
    expect(computeScheduledFor(requestedAt, 'UTC', '22:00', null)).toBe(
      requestedAt,
    );
  });

  it('returns the requested instant unchanged when outside the configured window', () => {
    // 2026-07-15 is a Wednesday; noon UTC is well outside a 22:00-07:00 quiet window.
    const requestedAt = new Date('2026-07-15T12:00:00.000Z');
    expect(computeScheduledFor(requestedAt, 'UTC', '22:00', '07:00')).toBe(
      requestedAt,
    );
  });

  it('pushes to the same-day end for a same-day window', () => {
    const requestedAt = new Date('2026-07-15T13:30:00.000Z'); // 13:30 UTC
    const result = computeScheduledFor(requestedAt, 'UTC', '13:00', '14:00');
    expect(result.toISOString()).toBe('2026-07-15T14:00:00.000Z');
  });

  it('pushes to tomorrow’s end for an overnight window when currently on the evening side', () => {
    const requestedAt = new Date('2026-07-15T23:30:00.000Z'); // 23:30 UTC, within 22:00-07:00
    const result = computeScheduledFor(requestedAt, 'UTC', '22:00', '07:00');
    expect(result.toISOString()).toBe('2026-07-16T07:00:00.000Z');
  });

  it('pushes to today’s end for an overnight window when currently on the early-morning side', () => {
    const requestedAt = new Date('2026-07-16T05:00:00.000Z'); // 05:00 UTC, within 22:00-07:00
    const result = computeScheduledFor(requestedAt, 'UTC', '22:00', '07:00');
    expect(result.toISOString()).toBe('2026-07-16T07:00:00.000Z');
  });

  it('is timezone-aware, not just a UTC-clock check', () => {
    // 03:30 UTC is 23:30 in America/New_York the previous calendar day (UTC-4 in July, DST) —
    // within a 22:00-07:00 local quiet window, and the local end (07:00 local) is the next
    // *local* calendar day, which is still 2026-07-16 in UTC terms once converted back.
    const requestedAt = new Date('2026-07-16T03:30:00.000Z');
    const result = computeScheduledFor(
      requestedAt,
      'America/New_York',
      '22:00',
      '07:00',
    );
    // 07:00 America/New_York on 2026-07-16 (the local date the window's end falls on) = 11:00 UTC.
    expect(result.toISOString()).toBe('2026-07-16T11:00:00.000Z');
  });
});
