/**
 * Framework-free, unit-testable score math — this milestone's resolution of
 * docs/02-missing-requirements.md's long-open "Productivity Score — formula TBD" note. Every score
 * is 0-100 and documented here as the single source of truth AnalyticsService/AnalyticsSnapshotService
 * both call, rather than each computing it inline.
 */

export interface GoalProgressLike {
  progressPercent: number;
}

/** A single domain's own completion percentage — 0 when there's nothing to complete, the same
 * "empty means 0, not 100" convention HabitsService.summary already establishes for
 * completionPercentage. */
export function completionRate(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

/** Overall Productivity Score — an equal-weighted average of today's Task completion rate,
 * Planner block completion rate, and Habit completion rate. Documented as a simple, transparent
 * blend (not a magic weighting) precisely because the PRD never specified one; a future milestone
 * can retune the weights here without touching any caller. */
export function computeProductivityScore(
  taskCompletionPercent: number,
  plannerCompletionPercent: number,
  habitCompletionPercent: number,
): number {
  return Math.round(
    (taskCompletionPercent +
      plannerCompletionPercent +
      habitCompletionPercent) /
      3,
  );
}

/** Goal Score — the average `progressPercent` across a user's own ACTIVE goals (0 when there are
 * none), the same "average across the active set" shape the Dashboard's own
 * DashboardGoalsService.averageProgressPercent already established. */
export function computeGoalScore(goals: GoalProgressLike[]): number {
  if (goals.length === 0) {
    return 0;
  }
  const total = goals.reduce((sum, goal) => sum + goal.progressPercent, 0);
  return Math.round(total / goals.length);
}

/** Journal Score — the percentage of the trailing `windowDays` that have at least one entry, the
 * metric behind "Journal consistency." */
export function computeJournalScore(
  daysWithEntry: number,
  windowDays: number,
): number {
  return completionRate(daysWithEntry, windowDays);
}
