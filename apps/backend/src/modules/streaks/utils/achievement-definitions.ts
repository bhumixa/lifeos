/**
 * Single source of truth for the achievement catalog — every row AchievementsService upserts
 * into the `achievements` table (see the schema comment on Achievement) and every unlock
 * condition it evaluates come from this one array, so adding or re-tuning an achievement never
 * touches a controller or the database directly ("avoid hardcoding logic inside controllers" and
 * "keep the system data-driven" per the milestone brief).
 *
 * Conditions are plain predicates over `AchievementContext` — a snapshot of a user's current
 * derived stats StreaksService already computes for XP/streak purposes, reused here rather than
 * re-queried. Unlocking is **evaluated on read** (see AchievementsService.evaluateAndUnlock), not
 * via a live domain-event subscription: `longestStreak`/lifetime counts only ever grow, so a
 * later read always "catches" them becoming true. `isPerfectWeek`/`isPerfectMonth` are the one
 * exception — they can become true and then false again as the week/month moves on, so those two
 * achievements are only guaranteed to unlock if a GET /streaks* or /achievements* endpoint happens
 * to be called while the condition holds. Since the Dashboard calls GET /streaks/statistics on
 * every load, this is a reasonable best-effort trade-off for a foundation milestone rather than a
 * bug — a future scheduled evaluation job (mirroring the architecture doc's nightly
 * `analytics-rollup` cron) would make it exhaustive instead.
 */

export interface AchievementContext {
  totalHabitCompletions: number;
  totalTasksCompleted: number;
  totalRoutineCompletions: number;
  totalCompletedPlannerBlocks: number;
  longestStreak: number;
  isPerfectWeek: boolean;
  isPerfectMonth: boolean;
  morningHabitLogCount: number;
  nightHabitLogCount: number;
}

export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  isUnlocked: (context: AchievementContext) => boolean;
}

const MORNING_WARRIOR_THRESHOLD = 5;
const NIGHT_OWL_THRESHOLD = 5;
const PLANNER_MASTER_THRESHOLD = 50;
const TASK_CRUSHER_THRESHOLD = 50;
const HABIT_100_THRESHOLD = 100;

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    code: 'FIRST_HABIT',
    title: 'First Habit',
    description: 'Log your first habit completion.',
    icon: 'flag',
    xpReward: 10,
    isUnlocked: (ctx) => ctx.totalHabitCompletions >= 1,
  },
  {
    code: 'STREAK_3',
    title: '3 Day Streak',
    description: 'Reach a 3-day consistency streak.',
    icon: 'local_fire_department',
    xpReward: 15,
    isUnlocked: (ctx) => ctx.longestStreak >= 3,
  },
  {
    code: 'STREAK_7',
    title: '7 Day Streak',
    description: 'Reach a 7-day consistency streak.',
    icon: 'local_fire_department',
    xpReward: 30,
    isUnlocked: (ctx) => ctx.longestStreak >= 7,
  },
  {
    code: 'STREAK_30',
    title: '30 Day Streak',
    description: 'Reach a 30-day consistency streak.',
    icon: 'local_fire_department',
    xpReward: 100,
    isUnlocked: (ctx) => ctx.longestStreak >= 30,
  },
  {
    code: 'HABIT_100',
    title: '100 Habit Completions',
    description: 'Log 100 habit completions, all-time.',
    icon: 'workspace_premium',
    xpReward: 50,
    isUnlocked: (ctx) => ctx.totalHabitCompletions >= HABIT_100_THRESHOLD,
  },
  {
    code: 'PERFECT_WEEK',
    title: 'Perfect Week',
    description: 'Complete every active daily habit every day this week.',
    icon: 'auto_awesome',
    xpReward: 40,
    isUnlocked: (ctx) => ctx.isPerfectWeek,
  },
  {
    code: 'PERFECT_MONTH',
    title: 'Perfect Month',
    description: 'Complete every active daily habit every day this month.',
    icon: 'auto_awesome',
    xpReward: 150,
    isUnlocked: (ctx) => ctx.isPerfectMonth,
  },
  {
    code: 'MORNING_WARRIOR',
    title: 'Morning Warrior',
    description: 'Log 5 habit completions before 7 AM, your local time.',
    icon: 'wb_twilight',
    xpReward: 20,
    isUnlocked: (ctx) => ctx.morningHabitLogCount >= MORNING_WARRIOR_THRESHOLD,
  },
  {
    code: 'NIGHT_OWL',
    title: 'Night Owl',
    description: 'Log 5 habit completions after 10 PM, your local time.',
    icon: 'dark_mode',
    xpReward: 20,
    isUnlocked: (ctx) => ctx.nightHabitLogCount >= NIGHT_OWL_THRESHOLD,
  },
  {
    code: 'PLANNER_MASTER',
    title: 'Planner Master',
    description: 'Complete 50 planner blocks.',
    icon: 'event_available',
    xpReward: 40,
    isUnlocked: (ctx) =>
      ctx.totalCompletedPlannerBlocks >= PLANNER_MASTER_THRESHOLD,
  },
  {
    code: 'TASK_CRUSHER',
    title: 'Task Crusher',
    description: 'Complete 50 tasks.',
    icon: 'task_alt',
    xpReward: 40,
    isUnlocked: (ctx) => ctx.totalTasksCompleted >= TASK_CRUSHER_THRESHOLD,
  },
];
