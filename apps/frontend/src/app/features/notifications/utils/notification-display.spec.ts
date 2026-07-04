import { formatRelativeTime, timelineGroup } from './notification-display';

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-15T12:00:00.000Z');

  it('renders "Just now" for anything under a minute old', () => {
    expect(formatRelativeTime(new Date('2026-07-15T11:59:30.000Z'), now)).toBe('Just now');
  });

  it('renders minutes for anything under an hour old', () => {
    expect(formatRelativeTime(new Date('2026-07-15T11:45:00.000Z'), now)).toBe('15m ago');
  });

  it('renders hours for anything under a day old', () => {
    expect(formatRelativeTime(new Date('2026-07-15T09:00:00.000Z'), now)).toBe('3h ago');
  });

  it('renders days for anything under a week old', () => {
    expect(formatRelativeTime(new Date('2026-07-13T12:00:00.000Z'), now)).toBe('2d ago');
  });

  it('falls back to a short date once past a week', () => {
    const result = formatRelativeTime(new Date('2026-06-01T12:00:00.000Z'), now);
    expect(result).not.toMatch(/ago$/);
  });
});

describe('timelineGroup', () => {
  // Built from local-time components (not an ISO/UTC string) so the day-boundary math this test
  // exercises doesn't depend on the machine's own timezone — timelineGroup's own contract is
  // "relative to the viewer's local calendar day" (see its class doc), so the test fixture must
  // vary with it the same way the function itself does.
  const now = new Date(2026, 6, 15, 12, 0, 0);

  it('buckets same-calendar-day instants as Today', () => {
    expect(timelineGroup(new Date(2026, 6, 15, 1, 0, 0), now)).toBe('Today');
  });

  it('buckets the previous calendar day as Yesterday', () => {
    expect(timelineGroup(new Date(2026, 6, 14, 23, 0, 0), now)).toBe('Yesterday');
  });

  it('buckets anything older as Earlier', () => {
    expect(timelineGroup(new Date(2026, 6, 10, 12, 0, 0), now)).toBe('Earlier');
  });
});
