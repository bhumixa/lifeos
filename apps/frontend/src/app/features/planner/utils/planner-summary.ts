import type { PlannerBlock } from '@lifeos/shared-types';

export interface PlannerSummary {
  nextBlock: PlannerBlock | null;
  /** Minutes remaining today across every not-yet-finished, not-completed block from `now`. */
  remainingMinutes: number;
  /** Total minutes across every FOCUS-type block in the day. */
  focusMinutes: number;
  completedCount: number;
  /** Not-yet-completed blocks starting after `now`, chronological. */
  upcomingBlocks: PlannerBlock[];
}

/**
 * Shared by the main app Dashboard's planner widgets and the Planner Dashboard page itself, so
 * "what counts as remaining/upcoming/focus time" is computed once — see CLAUDE.md's "never
 * duplicate logic" and "Dashboard ... reuse existing APIs whenever possible."
 */
export function computePlannerSummary(blocks: PlannerBlock[], now: Date): PlannerSummary {
  const nowMs = now.getTime();

  const upcomingBlocks = blocks
    .filter((block) => !block.completed && new Date(block.startTime).getTime() > nowMs)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const remainingMinutes = blocks
    .filter((block) => !block.completed && new Date(block.endTime).getTime() > nowMs)
    .reduce((total, block) => total + block.duration, 0);

  const focusMinutes = blocks
    .filter((block) => block.type === 'FOCUS')
    .reduce((total, block) => total + block.duration, 0);

  const completedCount = blocks.filter((block) => block.completed).length;

  return { nextBlock: upcomingBlocks[0] ?? null, remainingMinutes, focusMinutes, completedCount, upcomingBlocks };
}
