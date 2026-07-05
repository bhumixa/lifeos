/**
 * Framework-free, unit-testable analysis math — the same "no Prisma/DI, pure functions" shape
 * planner/utils/scheduler.util.ts and streaks/utils/streak-calculator.util.ts already establish.
 * AiAnalysisService feeds these plain rows/dates gathered from other modules' own read-only
 * methods; nothing here talks to Prisma directly.
 */

import { addDaysToDateString } from '../../planner/utils/timezone.util.js';

export interface DailyCompletionPoint {
  /** "YYYY-MM-DD" */
  date: string;
  completed: number;
  total: number;
}

export interface WeekOverWeekRate {
  completionRateThisWeek: number;
  completionRateLastWeek: number;
  deltaPercent: number;
}

/** Compares the trailing 7-day completion rate against the 7 days before it — the metric behind
 * "Your planner completion rate dropped 12% this week." `todayStr` is the boundary (inclusive),
 * already resolved in the user's own timezone by the caller. */
export function weekOverWeekCompletionRate(
  points: DailyCompletionPoint[],
  todayStr: string,
): WeekOverWeekRate {
  const thisWeekStart = addDaysToDateString(todayStr, -6);
  const lastWeekStart = addDaysToDateString(todayStr, -13);
  const lastWeekEnd = addDaysToDateString(todayStr, -7);

  const thisWeek = points.filter(
    (point) => point.date >= thisWeekStart && point.date <= todayStr,
  );
  const lastWeek = points.filter(
    (point) => point.date >= lastWeekStart && point.date <= lastWeekEnd,
  );

  const completionRateThisWeek = rateOf(thisWeek);
  const completionRateLastWeek = rateOf(lastWeek);

  return {
    completionRateThisWeek,
    completionRateLastWeek,
    deltaPercent: completionRateThisWeek - completionRateLastWeek,
  };
}

function rateOf(points: DailyCompletionPoint[]): number {
  const total = points.reduce((sum, point) => sum + point.total, 0);
  if (total === 0) {
    return 0;
  }
  const completed = points.reduce((sum, point) => sum + point.completed, 0);
  return Math.round((completed / total) * 100);
}

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Which weekday(s) (by name) had the most completions among the given "YYYY-MM-DD" dates — the
 * metric behind "Your highest productivity days are Tuesday and Wednesday." Ties return every
 * weekday sharing the max, rather than picking one arbitrarily. */
export function bestWeekdaysByCount(dates: string[]): string[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const date of dates) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    counts[weekday]++;
  }
  const max = Math.max(...counts);
  if (max === 0) {
    return [];
  }
  return counts
    .map((count, weekday) => ({ weekday, count }))
    .filter((entry) => entry.count === max)
    .map((entry) => WEEKDAY_NAMES[entry.weekday]);
}

/** Self-reported confidence, scaled by how much of the ideal analysis window actually has data —
 * a 3-day-old account trying a 14-day trend gets a low-confidence result rather than a
 * misleadingly precise one. */
export function computeConfidence(
  daysAvailable: number,
  targetDays: number,
): number {
  if (targetDays <= 0) {
    return 1;
  }
  return (
    Math.round(Math.max(0, Math.min(1, daysAvailable / targetDays)) * 100) / 100
  );
}

const MOOD_SCORES: Record<string, number> = {
  VERY_BAD: 1,
  BAD: 2,
  NEUTRAL: 3,
  GOOD: 4,
  EXCELLENT: 5,
};

/** Maps JournalEntry.mood's enum onto a 1-5 scale for trend math — null (no mood recorded) stays
 * null rather than defaulting to a middle value that would silently skew a trend. */
export function moodScore(mood: string | null): number | null {
  return mood ? (MOOD_SCORES[mood] ?? null) : null;
}

export interface MoodTrend {
  direction: 'IMPROVING' | 'DECLINING' | 'STABLE';
  consecutiveDays: number;
}

/** Walks a mood history (newest first, each already-scored 1-5) for the longest unbroken
 * non-decreasing (improving) or non-increasing (declining) run starting from today — the metric
 * behind "Journal mood improved for 6 consecutive days." A run shorter than 3 days is reported as
 * STABLE rather than a trend, since 1-2 data points are noise, not a pattern. */
export function computeMoodTrend(scoresNewestFirst: number[]): MoodTrend {
  if (scoresNewestFirst.length === 0) {
    return { direction: 'STABLE', consecutiveDays: 0 };
  }

  let improvingRun = 1;
  for (let i = 0; i < scoresNewestFirst.length - 1; i++) {
    if (scoresNewestFirst[i] >= scoresNewestFirst[i + 1]) {
      improvingRun++;
    } else {
      break;
    }
  }

  let decliningRun = 1;
  for (let i = 0; i < scoresNewestFirst.length - 1; i++) {
    if (scoresNewestFirst[i] <= scoresNewestFirst[i + 1]) {
      decliningRun++;
    } else {
      break;
    }
  }

  if (improvingRun >= 3 && improvingRun >= decliningRun) {
    return { direction: 'IMPROVING', consecutiveDays: improvingRun };
  }
  if (decliningRun >= 3 && decliningRun > improvingRun) {
    return { direction: 'DECLINING', consecutiveDays: decliningRun };
  }
  return {
    direction: 'STABLE',
    consecutiveDays: Math.max(improvingRun, decliningRun),
  };
}

export interface GoalRisk {
  expectedPercent: number;
  deltaPercent: number;
  atRisk: boolean;
}

/** Compares a goal's actual `progressPercent` against where it "should" be if progress were
 * spread evenly between `startDateStr` (or, absent one, `todayStr`) and `targetDateStr` — the
 * metric behind "Goal X may miss its deadline." A goal already past its target date, or more than
 * 15 points behind schedule, is flagged at-risk. */
export function computeGoalRisk(
  startDateStr: string | null,
  targetDateStr: string,
  currentPercent: number,
  todayStr: string,
): GoalRisk {
  const start = startDateStr ?? todayStr;
  const totalDays = daysBetween(start, targetDateStr);
  const elapsedDays = daysBetween(start, todayStr);
  const expectedPercent =
    totalDays <= 0
      ? 100
      : Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  const deltaPercent = currentPercent - expectedPercent;
  const isPastDue = todayStr > targetDateStr && currentPercent < 100;

  return {
    expectedPercent,
    deltaPercent,
    atRisk: isPastDue || deltaPercent <= -15,
  };
}

function daysBetween(fromStr: string, toStr: string): number {
  const from = Date.parse(`${fromStr}T00:00:00Z`);
  const to = Date.parse(`${toStr}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}
