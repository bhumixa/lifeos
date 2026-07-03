/**
 * XP is entirely derived — see the schema comment on Achievement: nothing here is stored. Every
 * total is recomputed from existing Task/HabitLog/PlannerBlock rows (and this file's own "was
 * this day perfect" input, itself derived by streak-calculator.util) on every read, the same
 * "prepare the foundation, don't build levels yet" scope the milestone brief asks for — a level
 * system would need a persisted running total to attach meaning to (XP resets/decays never make
 * sense mid-total), which is explicitly out of scope here.
 */

export const XP_TASK_COMPLETED = 10;
export const XP_HABIT_COMPLETED = 5;
export const XP_ROUTINE_COMPLETED = 15;
export const XP_PERFECT_DAY = 50;

export interface XpTotals {
  tasksCompleted: number;
  habitCompletions: number;
  routineCompletions: number;
  perfectDays: number;
}

export function computeTotalXp(totals: XpTotals): number {
  return (
    totals.tasksCompleted * XP_TASK_COMPLETED +
    totals.habitCompletions * XP_HABIT_COMPLETED +
    totals.routineCompletions * XP_ROUTINE_COMPLETED +
    totals.perfectDays * XP_PERFECT_DAY
  );
}
