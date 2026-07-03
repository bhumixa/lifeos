import {
  findFreeSlot,
  hasOverlap,
  intervalsOverlap,
  type Interval,
} from './scheduler.util.js';

const at = (hhmm: string): Date => new Date(`2026-07-03T${hhmm}:00.000Z`);

describe('intervalsOverlap / hasOverlap', () => {
  it('detects a partial overlap', () => {
    const a: Interval = { start: at('09:00'), end: at('10:00') };
    const b: Interval = { start: at('09:30'), end: at('10:30') };
    expect(intervalsOverlap(a, b)).toBe(true);
  });

  it('detects one interval fully containing another as overlapping', () => {
    const a: Interval = { start: at('09:00'), end: at('12:00') };
    const b: Interval = { start: at('10:00'), end: at('11:00') };
    expect(intervalsOverlap(a, b)).toBe(true);
  });

  it('treats back-to-back intervals (end === start) as not overlapping', () => {
    const a: Interval = { start: at('09:00'), end: at('10:00') };
    const b: Interval = { start: at('10:00'), end: at('11:00') };
    expect(intervalsOverlap(a, b)).toBe(false);
  });

  it('does not overlap when there is a gap', () => {
    const a: Interval = { start: at('09:00'), end: at('10:00') };
    const b: Interval = { start: at('10:30'), end: at('11:00') };
    expect(intervalsOverlap(a, b)).toBe(false);
  });

  it('hasOverlap checks a candidate against every occupied interval', () => {
    const occupied: Interval[] = [
      { start: at('09:00'), end: at('10:00') },
      { start: at('13:00'), end: at('14:00') },
    ];
    expect(hasOverlap({ start: at('13:30'), end: at('13:45') }, occupied)).toBe(
      true,
    );
    expect(hasOverlap({ start: at('11:00'), end: at('12:00') }, occupied)).toBe(
      false,
    );
  });
});

describe('findFreeSlot', () => {
  const windowStart = at('07:00');
  const windowEnd = at('22:00');

  it('places the block at the window start when nothing is occupied', () => {
    const slot = findFreeSlot([], 30, 10, windowStart, windowEnd);
    expect(slot).toEqual({ start: at('07:00'), end: at('07:30') });
  });

  it('finds the gap between two occupied intervals, respecting the buffer', () => {
    const occupied: Interval[] = [
      // Fills the window from its very start so the interesting gap is the one between this
      // block and the next, not the wide-open space before either of them.
      { start: at('07:00'), end: at('09:00') },
      { start: at('09:00'), end: at('10:00') },
      { start: at('10:20'), end: at('11:00') },
    ];
    // Gap is 10:00-10:20 (20 min), but a 10-minute buffer on each side leaves no room for a
    // 15-minute block there, so it should skip past both and land after the buffer on the
    // second block instead — not overlap or violate the buffer.
    const slot = findFreeSlot(occupied, 15, 10, windowStart, windowEnd);
    expect(slot).toEqual({ start: at('11:10'), end: at('11:25') });
  });

  it('fits exactly in a gap that is exactly duration + buffers wide', () => {
    const occupied: Interval[] = [
      { start: at('07:00'), end: at('09:00') },
      { start: at('09:00'), end: at('10:00') },
      // Raw gap 10:00 -> 11:00 (60 min); minus a 10-minute buffer on each side leaves exactly
      // 10:10 -> 10:50 (40 min) — fits a 40-minute block exactly, with no slack either side.
      { start: at('11:00'), end: at('11:10') },
    ];
    const slot = findFreeSlot(occupied, 40, 10, windowStart, windowEnd);
    expect(slot).toEqual({ start: at('10:10'), end: at('10:50') });
  });

  it('returns null when nothing fits before the window end', () => {
    const occupied: Interval[] = [{ start: at('07:00'), end: at('21:55') }];
    const slot = findFreeSlot(occupied, 30, 10, windowStart, windowEnd);
    expect(slot).toBeNull();
  });

  it('never overlaps any occupied interval in its result', () => {
    const occupied: Interval[] = [
      { start: at('08:00'), end: at('09:00') },
      { start: at('09:15'), end: at('10:00') },
      { start: at('10:05'), end: at('12:00') },
    ];
    const slot = findFreeSlot(occupied, 20, 5, windowStart, windowEnd);
    expect(slot).not.toBeNull();
    expect(hasOverlap(slot as Interval, occupied)).toBe(false);
  });

  it('does not depend on occupied intervals being pre-sorted', () => {
    const sorted: Interval[] = [
      { start: at('09:00'), end: at('10:00') },
      { start: at('12:00'), end: at('13:00') },
    ];
    const shuffled = [sorted[1], sorted[0]];

    expect(findFreeSlot(sorted, 30, 10, windowStart, windowEnd)).toEqual(
      findFreeSlot(shuffled, 30, 10, windowStart, windowEnd),
    );
  });
});
