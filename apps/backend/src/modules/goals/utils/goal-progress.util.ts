/** Pure, Prisma-free progress math — kept framework-free so percent/completion edge cases (zero
 * target, over-target values) are unit-testable without mocking Prisma, the same "framework-free,
 * unit-testable" idea Planner's utils/ and Streaks' utils/ already establish for their own math. */

/** currentValue / targetValue as a whole-number percent, clamped to [0, 100]. A `targetValue` of
 * 0 or less can't happen through CreateGoalDto's `@Min(1)` validation, but is guarded anyway
 * (returns 0) so this function has no undefined behavior if ever called with unvalidated input. */
export function computeProgressPercent(
  currentValue: number,
  targetValue: number,
): number {
  if (targetValue <= 0) {
    return 0;
  }
  return Math.min(
    100,
    Math.max(0, Math.round((currentValue / targetValue) * 100)),
  );
}

/** How much further currentValue needs to go to reach targetValue — never negative, since a
 * currentValue past targetValue just means the goal is already complete, not "over by N". */
export function computeRemainingValue(
  currentValue: number,
  targetValue: number,
): number {
  return Math.max(0, targetValue - currentValue);
}

/** A goal counts as complete once currentValue reaches (or passes) targetValue — independent of
 * `status`, which stays a separate, user/service-controlled field (see the comment on Goal in
 * prisma/schema.prisma). */
export function isProgressComplete(
  currentValue: number,
  targetValue: number,
): boolean {
  return currentValue >= targetValue;
}
