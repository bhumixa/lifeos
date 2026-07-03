import type { PlannerBlock } from '@lifeos/shared-types';
import {
  addDaysToLocalDateString,
  blockColor,
  detectConflicts,
  formatDuration,
  minutesSinceMidnight,
  toLocalDateString,
} from './planner-display';

function makeBlock(overrides: Partial<PlannerBlock>): PlannerBlock {
  return {
    id: 'block-1',
    plannerDayId: 'day-1',
    type: 'CUSTOM',
    referenceId: null,
    title: 'Block',
    description: null,
    startTime: '2026-07-03T09:00:00.000Z',
    endTime: '2026-07-03T09:30:00.000Z',
    duration: 30,
    color: null,
    completed: false,
    order: 0,
    goalId: null,
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('detectConflicts', () => {
  it('flags two overlapping blocks and nothing else', () => {
    const a = makeBlock({ id: 'a', startTime: '2026-07-03T09:00:00.000Z', endTime: '2026-07-03T10:00:00.000Z' });
    const b = makeBlock({ id: 'b', startTime: '2026-07-03T09:30:00.000Z', endTime: '2026-07-03T10:30:00.000Z' });
    const c = makeBlock({ id: 'c', startTime: '2026-07-03T11:00:00.000Z', endTime: '2026-07-03T12:00:00.000Z' });

    const conflicts = detectConflicts([a, b, c]);

    expect(conflicts.has('a')).toBe(true);
    expect(conflicts.has('b')).toBe(true);
    expect(conflicts.has('c')).toBe(false);
  });

  it('treats back-to-back blocks as not conflicting', () => {
    const a = makeBlock({ id: 'a', startTime: '2026-07-03T09:00:00.000Z', endTime: '2026-07-03T10:00:00.000Z' });
    const b = makeBlock({ id: 'b', startTime: '2026-07-03T10:00:00.000Z', endTime: '2026-07-03T11:00:00.000Z' });

    expect(detectConflicts([a, b]).size).toBe(0);
  });

  it('returns an empty set for no blocks or a single block', () => {
    expect(detectConflicts([]).size).toBe(0);
    expect(detectConflicts([makeBlock({})]).size).toBe(0);
  });
});

describe('toLocalDateString', () => {
  it('formats using local calendar components, not a UTC conversion', () => {
    const date = new Date(2026, 6, 3); // July 3, 2026, local time — month is 0-indexed
    expect(toLocalDateString(date)).toBe('2026-07-03');
  });

  it('zero-pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5); // January 5, 2026
    expect(toLocalDateString(date)).toBe('2026-01-05');
  });
});

describe('addDaysToLocalDateString', () => {
  it('rolls over a month boundary', () => {
    expect(addDaysToLocalDateString('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('moves backward across a month boundary', () => {
    expect(addDaysToLocalDateString('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('minutesSinceMidnight', () => {
  it('reads hours/minutes from the local wall-clock time', () => {
    const date = new Date(2026, 6, 3, 9, 30);
    expect(minutesSinceMidnight(date.toISOString())).toBe(9 * 60 + 30);
  });
});

describe('formatDuration', () => {
  it('formats minutes-only, hours-only, and mixed durations', () => {
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(95)).toBe('1h 35m');
    expect(formatDuration(0)).toBe('0m');
  });
});

describe('blockColor', () => {
  it("uses the block's own color when set", () => {
    expect(blockColor(makeBlock({ color: '#123456' }))).toBe('#123456');
  });

  it('falls back to a per-type default when color is null', () => {
    expect(blockColor(makeBlock({ type: 'FOCUS', color: null }))).toBe('#FF9800');
  });
});
