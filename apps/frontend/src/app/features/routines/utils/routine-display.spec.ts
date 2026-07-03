import { formatDuration, formatTimeOfDay, timeToMinutes } from './routine-display';

describe('timeToMinutes', () => {
  it('converts HH:mm to minutes since midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('07:30')).toBe(450);
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('formatTimeOfDay', () => {
  // Uses the runtime's locale (Intl, via toLocaleTimeString(undefined, ...)) — same as the actual
  // UI — so this only asserts the minute component rather than assuming a specific 12/24-hour
  // convention, which varies by test environment.
  it('preserves the minute value', () => {
    expect(formatTimeOfDay('07:05')).toContain('05');
    expect(formatTimeOfDay('14:30')).toContain('30');
  });

  it('returns a non-empty formatted string', () => {
    expect(formatTimeOfDay('00:00').length).toBeGreaterThan(0);
  });
});

describe('formatDuration', () => {
  it('formats minutes-only durations', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45)).toBe('45m');
  });

  it('formats hour-only durations', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(120)).toBe('2h');
  });

  it('formats hours-and-minutes durations', () => {
    expect(formatDuration(95)).toBe('1h 35m');
  });
});
