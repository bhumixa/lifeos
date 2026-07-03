/**
 * Zero-dependency IANA-timezone helpers for the Planner. No date library (date-fns-tz, luxon) is
 * installed in this repo yet, and this module's needs are narrow enough — "what's today in this
 * user's zone" and "what UTC instant is 08:00 local on this date" — that `Intl.DateTimeFormat`
 * (which already knows the full IANA tz database, DST rules included) covers them without adding
 * one. HabitsService/RoutinesService predate per-user timezone use entirely (see their comments);
 * this is the first module that actually needs it, per docs/09-roadmap.md's flagged risk that
 * streak/schedule timezone handling is easy to get subtly wrong.
 */

/** "YYYY-MM-DD" (en-CA formats in that exact order) for the given instant, as seen in `timeZone`. */
export function getZonedDateString(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** The IANA-zone UTC offset, in minutes, in effect at `instant` — varies across DST transitions,
 * which is exactly why this can't be a fixed lookup table. */
function getOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  // Reading the zoned wall-clock time back as if it were UTC, then diffing against the real UTC
  // instant, yields the zone's offset at that instant — this is what makes it DST-correct.
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/**
 * Converts a wall-clock "YYYY-MM-DD" + "HH:mm" in `timeZone` to the UTC instant it represents.
 * Two passes: the first computes the offset from a naive guess, the second re-derives the offset
 * from the corrected instant — necessary right at a DST transition, where the offset for the
 * naive guess and the offset for the true instant can differ by the transition's own size (e.g.
 * one hour). Two passes converge for every real-world zone; a wall-clock time that's skipped
 * entirely by a spring-forward transition (e.g. 2:30 AM on the day clocks jump from 2 to 3) has
 * no true instant to converge to — that ambiguity is inherent to local time, not a bug here, and
 * is out of scope the same way this codebase treats other unresolved edge cases (see
 * docs/02-missing-requirements.md).
 */
export function zonedWallTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  const firstOffset = getOffsetMinutes(new Date(naiveUtc), timeZone);
  const corrected = naiveUtc - firstOffset * 60_000;
  const secondOffset = getOffsetMinutes(new Date(corrected), timeZone);

  return new Date(naiveUtc - secondOffset * 60_000);
}

/** Adds `minutes` to a Date, returning a new instance (Date is otherwise mutable in place). */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Whole minutes between two instants, rounded — used to (re-)derive PlannerBlock.duration. */
export function diffMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

/** Parses a "YYYY-MM-DD" string to the UTC-midnight Date Prisma's `@db.Date` columns expect —
 * same convention as HabitsService.toDateOnly, spelled out via Date.UTC rather than relying on
 * the Date constructor's own date-only parsing, for consistency with the rest of the codebase. */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Inverse of `parseDateOnly` — reads the UTC calendar-date components back out. Used for
 * PlannerDay.date, which is already a pure calendar date (not an instant), so this is direct
 * component extraction, not a timezone conversion — using `getZonedDateString` here would be
 * wrong (it would re-localize a value that's already a calendar date, not an instant). */
export function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calendar-date arithmetic (not instant arithmetic) — adding a day to the last day of a month
 * rolls over correctly via Date.UTC's own overflow handling. Deliberately not "add 24 hours",
 * which would land on the wrong wall-clock time across a DST boundary. */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return formatDateOnly(new Date(Date.UTC(year, month - 1, day + days)));
}
