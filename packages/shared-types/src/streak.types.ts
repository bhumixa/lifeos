import type { HabitFrequency } from './habit.types.js';

export interface HabitStreak {
  habitId: string;
  name: string;
  icon: string;
  color: string;
  targetFrequency: HabitFrequency;
  currentStreak: number;
  longestStreak: number;
  /** Whether the habit's current period (day/week/month, per targetFrequency) has already met its targetCount. */
  currentPeriodMet: boolean;
}

export interface StreaksOverview {
  /** False when the user has no active DAILY-frequency habits — overall streak fields are 0 in that case. */
  hasDailyHabits: boolean;
  /** Overall consistency streak across all active DAILY habits combined. */
  currentStreak: number;
  longestStreak: number;
  habits: HabitStreak[];
}

export interface StreaksToday {
  /** "YYYY-MM-DD", in the user's own timezone. */
  date: string;
  hasDailyHabits: boolean;
  totalDailyHabits: number;
  completedDailyHabits: number;
  /** Active daily habit IDs not yet completed today. */
  remainingHabitIds: string[];
  isTodaySuccessful: boolean;
  isFrozenToday: boolean;
  freezesRemainingThisMonth: number;
}

export interface StreakTotals {
  tasksCompleted: number;
  habitCompletions: number;
  routineCompletions: number;
  perfectDays: number;
}

export interface FreezeDaysSummary {
  usedThisMonth: number;
  remainingThisMonth: number;
  monthlyQuota: number;
}

/** One cell for the Weekly/Monthly Heatmap. */
export interface DailyHistoryEntry {
  /** "YYYY-MM-DD". */
  date: string;
  completedCount: number;
  totalCount: number;
  successful: boolean;
}

export interface StreaksStatistics {
  hasDailyHabits: boolean;
  currentStreak: number;
  longestStreak: number;
  /** Percent of the trailing 7 days (including today) that were successful. */
  weeklyConsistency: number;
  /** Percent of the trailing 30 days (including today) that were successful. */
  monthlyConsistency: number;
  /** Percent of days successful since the earliest active daily habit was created (bounded lookback). */
  successRate: number;
  isPerfectWeek: boolean;
  isPerfectMonth: boolean;
  xpEarned: number;
  totals: StreakTotals;
  freezeDays: FreezeDaysSummary;
  /** Trailing daily history (bounded lookback window) powering the Weekly/Monthly Heatmap. */
  dailyHistory: DailyHistoryEntry[];
}

export interface HabitStreakPeriod {
  /** "YYYY-MM-DD" — the first day of this period (a day itself, for DAILY habits; a Monday for
   * WEEKLY; the 1st for MONTHLY). */
  periodStart: string;
  completedCount: number;
  met: boolean;
}

export interface HabitStreakDetail {
  habitId: string;
  name: string;
  icon: string;
  color: string;
  targetFrequency: HabitFrequency;
  targetCount: number;
  currentStreak: number;
  longestStreak: number;
  currentPeriodCount: number;
  currentPeriodMet: boolean;
  /** Most recent periods (days/weeks/months, per targetFrequency), oldest first. */
  history: HabitStreakPeriod[];
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  /** ISO datetime, or null if not yet unlocked. */
  unlockedAt: string | null;
}

export interface UseFreezeDayRequest {
  /** "YYYY-MM-DD"; defaults to today (in the user's timezone) when omitted. Must not be in the future. */
  date?: string;
}

export interface FreezeDayStatus {
  date: string;
  usedThisMonth: number;
  remainingThisMonth: number;
  monthlyQuota: number;
  isDateFrozen: boolean;
}
