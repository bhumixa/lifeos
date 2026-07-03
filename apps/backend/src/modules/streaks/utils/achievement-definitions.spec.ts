import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementContext,
} from './achievement-definitions.js';

const BASE_CONTEXT: AchievementContext = {
  totalHabitCompletions: 0,
  totalTasksCompleted: 0,
  totalRoutineCompletions: 0,
  totalCompletedPlannerBlocks: 0,
  longestStreak: 0,
  isPerfectWeek: false,
  isPerfectMonth: false,
  morningHabitLogCount: 0,
  nightHabitLogCount: 0,
};

function definition(code: string) {
  const found = ACHIEVEMENT_DEFINITIONS.find((def) => def.code === code);
  if (!found) {
    throw new Error(`No achievement definition for ${code}`);
  }
  return found;
}

describe('ACHIEVEMENT_DEFINITIONS', () => {
  it('has a unique code per achievement', () => {
    const codes = ACHIEVEMENT_DEFINITIONS.map((def) => def.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every achievement stays locked against the zeroed base context', () => {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(def.isUnlocked(BASE_CONTEXT)).toBe(false);
    }
  });

  it('FIRST_HABIT unlocks on the very first habit completion', () => {
    expect(
      definition('FIRST_HABIT').isUnlocked({
        ...BASE_CONTEXT,
        totalHabitCompletions: 1,
      }),
    ).toBe(true);
  });

  it.each([
    ['STREAK_3', 3],
    ['STREAK_7', 7],
    ['STREAK_30', 30],
  ])(
    '%s unlocks once longestStreak reaches %d, not before',
    (code, threshold) => {
      expect(
        definition(code).isUnlocked({
          ...BASE_CONTEXT,
          longestStreak: threshold - 1,
        }),
      ).toBe(false);
      expect(
        definition(code).isUnlocked({
          ...BASE_CONTEXT,
          longestStreak: threshold,
        }),
      ).toBe(true);
    },
  );

  it('HABIT_100 requires 100 lifetime completions', () => {
    expect(
      definition('HABIT_100').isUnlocked({
        ...BASE_CONTEXT,
        totalHabitCompletions: 99,
      }),
    ).toBe(false);
    expect(
      definition('HABIT_100').isUnlocked({
        ...BASE_CONTEXT,
        totalHabitCompletions: 100,
      }),
    ).toBe(true);
  });

  it('PERFECT_WEEK/PERFECT_MONTH track their own boolean flags independently', () => {
    expect(
      definition('PERFECT_WEEK').isUnlocked({
        ...BASE_CONTEXT,
        isPerfectWeek: true,
      }),
    ).toBe(true);
    expect(
      definition('PERFECT_WEEK').isUnlocked({
        ...BASE_CONTEXT,
        isPerfectMonth: true,
      }),
    ).toBe(false);
    expect(
      definition('PERFECT_MONTH').isUnlocked({
        ...BASE_CONTEXT,
        isPerfectMonth: true,
      }),
    ).toBe(true);
  });

  it('MORNING_WARRIOR and NIGHT_OWL track separate counters', () => {
    expect(
      definition('MORNING_WARRIOR').isUnlocked({
        ...BASE_CONTEXT,
        morningHabitLogCount: 5,
      }),
    ).toBe(true);
    expect(
      definition('MORNING_WARRIOR').isUnlocked({
        ...BASE_CONTEXT,
        nightHabitLogCount: 5,
      }),
    ).toBe(false);
    expect(
      definition('NIGHT_OWL').isUnlocked({
        ...BASE_CONTEXT,
        nightHabitLogCount: 5,
      }),
    ).toBe(true);
  });

  it('PLANNER_MASTER and TASK_CRUSHER each require 50 completions of their own kind', () => {
    expect(
      definition('PLANNER_MASTER').isUnlocked({
        ...BASE_CONTEXT,
        totalCompletedPlannerBlocks: 50,
      }),
    ).toBe(true);
    expect(
      definition('TASK_CRUSHER').isUnlocked({
        ...BASE_CONTEXT,
        totalTasksCompleted: 50,
      }),
    ).toBe(true);
    expect(
      definition('TASK_CRUSHER').isUnlocked({
        ...BASE_CONTEXT,
        totalCompletedPlannerBlocks: 50,
      }),
    ).toBe(false);
  });
});
