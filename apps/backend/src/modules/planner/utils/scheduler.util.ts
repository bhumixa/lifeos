/**
 * Pure, deterministic slot-finding for POST /planner/generate. No AI, no randomness — the same
 * inputs always produce the same schedule, per the milestone brief. Kept free of Prisma/Nest so
 * it can be unit-tested as plain functions (overlap/buffer/window-edge cases) without mocking
 * anything.
 */

export interface Interval {
  start: Date;
  end: Date;
}

/** True if two half-open intervals [start, end) overlap at all. */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** True if `candidate` overlaps any interval already in `occupied`. */
export function hasOverlap(candidate: Interval, occupied: Interval[]): boolean {
  return occupied.some((existing) => intervalsOverlap(candidate, existing));
}

/**
 * Finds the earliest gap within [windowStart, windowEnd) that fits `durationMinutes`, leaving at
 * least `bufferMinutes` between the new block and whatever is already occupied on either side.
 * Returns null if nothing fits — callers surface that as "unscheduled" rather than overlapping
 * something or spilling outside the day window.
 */
export function findFreeSlot(
  occupied: Interval[],
  durationMinutes: number,
  bufferMinutes: number,
  windowStart: Date,
  windowEnd: Date,
): Interval | null {
  const sorted = [...occupied].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const durationMs = durationMinutes * 60_000;
  const bufferMs = bufferMinutes * 60_000;

  let cursor = windowStart.getTime();

  for (const block of sorted) {
    const gapEnd = block.start.getTime() - bufferMs;
    if (gapEnd - cursor >= durationMs) {
      return { start: new Date(cursor), end: new Date(cursor + durationMs) };
    }
    cursor = Math.max(cursor, block.end.getTime() + bufferMs);
  }

  if (windowEnd.getTime() - cursor >= durationMs) {
    return { start: new Date(cursor), end: new Date(cursor + durationMs) };
  }

  return null;
}
