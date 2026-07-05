import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  GoalStatus,
  InsightType,
  TaskStatus,
} from '../../../generated/prisma/index.js';
import { GoalsService } from '../goals/goals.service.js';
import { HabitsService } from '../habits/habits.service.js';
import { JournalService } from '../journal/journal.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PlannerService } from '../planner/planner.service.js';
import { StreaksService } from '../streaks/streaks.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import {
  addDaysToDateString,
  formatDateOnly,
  getZonedDateString,
  getZonedHour,
} from '../planner/utils/timezone.util.js';
import {
  bestWeekdaysByCount,
  computeConfidence,
  computeGoalRisk,
  computeMoodTrend,
  moodScore,
  weekOverWeekCompletionRate,
  type DailyCompletionPoint,
} from './utils/ai-metrics.util.js';
import type {
  AtRiskGoal,
  GoalsSourceData,
  HabitsSourceData,
  JournalSourceData,
  PlannerSourceData,
  ProductivitySourceData,
  StreaksSourceData,
} from './utils/insight-templates.util.js';

/** How far back the week-over-week trend metrics (Productivity/Planner) look — two trailing
 * 7-day windows, the same "generous but bounded" shape Streaks' own STREAK_LOOKBACK_DAYS uses for
 * a different reason (there: recomputation cost; here: a 14-day-old signal isn't a "trend"
 * anymore). */
const TREND_WINDOW_DAYS = 14;
/** How far back the Goals/Journal/Habits analyses look for their own, shorter-horizon signals. */
const RECENT_WINDOW_DAYS = 30;
const JOURNAL_ENTRIES_ANALYZED = 14;
const MORNING_HOUR_CUTOFF = 10;

/**
 * Gathers the read-only metrics every AiInsight is generated from — the "analysis engine" this
 * milestone's brief names. Strictly read-only: every method it calls on a sibling service is one
 * that only reads (see the class doc on AiInsight in prisma/schema.prisma for the two methods
 * deliberately *not* reused — StreaksService.getStatistics and GoalsService.getProgress — because
 * both have a persisting side effect, which this module's "AI Coach never modifies data" business
 * rule rules out even indirectly). Metrics this milestone needs that no existing service method
 * exposes (week-by-week completion-rate trends, weekday/hour distributions) are computed here via
 * direct, read-only PrismaService queries scoped by `userId` — the same "raw read for a
 * cross-cutting query that doesn't belong to one sibling module's own read shape" reasoning
 * Journal/Calendar/Notifications already established for their own optional-link ownership checks,
 * applied here to analytics instead.
 */
@Injectable()
export class AiAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly habitsService: HabitsService,
    private readonly plannerService: PlannerService,
    private readonly streaksService: StreaksService,
    private readonly goalsService: GoalsService,
    private readonly journalService: JournalService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async computeSourceData(
    userId: string,
    type: InsightType,
  ): Promise<Record<string, unknown>> {
    switch (type) {
      case InsightType.PRODUCTIVITY:
        return (await this.computeProductivity(userId)) as unknown as Record<
          string,
          unknown
        >;
      case InsightType.HABITS:
        return (await this.computeHabits(userId)) as unknown as Record<
          string,
          unknown
        >;
      case InsightType.GOALS:
        return (await this.computeGoals(userId)) as unknown as Record<
          string,
          unknown
        >;
      case InsightType.PLANNER:
        return (await this.computePlanner(userId)) as unknown as Record<
          string,
          unknown
        >;
      case InsightType.JOURNAL:
        return (await this.computeJournal(userId)) as unknown as Record<
          string,
          unknown
        >;
      case InsightType.STREAKS:
        return (await this.computeStreaks(userId)) as unknown as Record<
          string,
          unknown
        >;
      case InsightType.SYSTEM:
        return {
          reason: 'General coaching note — no specific domain requested.',
        };
    }
  }

  private async computeProductivity(
    userId: string,
  ): Promise<ProductivitySourceData> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const fromDateStr = addDaysToDateString(todayStr, -(TREND_WINDOW_DAYS - 1));
    const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);

    const [taskPoints, plannerPoints, completedWeekdayDates, unread] =
      await Promise.all([
        this.dailyTaskCompletionPoints(userId, fromDate),
        this.dailyPlannerCompletionPoints(userId, fromDate),
        this.combinedCompletionWeekdayDates(userId, fromDate),
        this.notificationsService.findUnread(userId),
      ]);

    const merged = mergeDailyPoints(taskPoints, plannerPoints);
    const rate = weekOverWeekCompletionRate(merged, todayStr);
    const daysAvailable = await this.daysOfHistoryAvailable(
      userId,
      TREND_WINDOW_DAYS,
    );

    return {
      ...rate,
      bestWeekdays: bestWeekdaysByCount(completedWeekdayDates),
      unreadNotifications: unread.length,
      daysAvailable,
      confidence: computeConfidence(daysAvailable, TREND_WINDOW_DAYS),
      flags: rate.deltaPercent <= -10 ? ['risk'] : [],
    };
  }

  private async computeHabits(userId: string): Promise<HabitsSourceData> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const fromDateStr = addDaysToDateString(
      todayStr,
      -(RECENT_WINDOW_DAYS - 1),
    );
    const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);

    const [summary, logs] = await Promise.all([
      this.habitsService.summary(userId),
      this.prisma.habitLog.findMany({
        where: { habit: { userId, deletedAt: null }, date: { gte: fromDate } },
        select: { createdAt: true },
      }),
    ]);

    const morningCompletions = logs.filter(
      (log) => getZonedHour(log.createdAt, timezone) < MORNING_HOUR_CUTOFF,
    ).length;
    const eveningCompletions = logs.length - morningCompletions;
    const daysAvailable = await this.daysOfHistoryAvailable(
      userId,
      RECENT_WINDOW_DAYS,
    );

    return {
      completionPercentageToday: summary.completionPercentage,
      totalActiveHabits: summary.totalActiveHabits,
      habitsCompletedToday: summary.habitsCompletedToday,
      morningCompletions,
      eveningCompletions,
      confidence: computeConfidence(daysAvailable, RECENT_WINDOW_DAYS),
      flags: [],
    };
  }

  private async computeGoals(userId: string): Promise<GoalsSourceData> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);

    const { data: goals } = await this.goalsService.findAll(userId, {
      status: GoalStatus.ACTIVE,
      archived: false,
      page: 1,
      pageSize: 100,
    });

    const atRiskGoals: AtRiskGoal[] = [];
    for (const goal of goals) {
      if (!goal.targetDate) {
        continue;
      }
      const risk = computeGoalRisk(
        goal.startDate,
        goal.targetDate,
        goal.progressPercent,
        todayStr,
      );
      if (risk.atRisk) {
        atRiskGoals.push({
          id: goal.id,
          title: goal.title,
          progressPercent: goal.progressPercent,
          expectedPercent: risk.expectedPercent,
          targetDate: goal.targetDate,
        });
      }
    }

    return {
      activeGoalCount: goals.length,
      onTrackCount: goals.length - atRiskGoals.length,
      atRiskGoals,
      confidence: goals.length === 0 ? 0.5 : 0.9,
      flags: atRiskGoals.length > 0 ? ['risk'] : [],
    };
  }

  private async computePlanner(userId: string): Promise<PlannerSourceData> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const fromDateStr = addDaysToDateString(todayStr, -(TREND_WINDOW_DAYS - 1));
    const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);

    const points = await this.dailyPlannerCompletionPoints(userId, fromDate);
    const rate = weekOverWeekCompletionRate(points, todayStr);
    const totalBlocksThisWeek = points
      .filter((point) => point.date >= addDaysToDateString(todayStr, -6))
      .reduce((sum, point) => sum + point.total, 0);
    const daysAvailable = await this.daysOfHistoryAvailable(
      userId,
      TREND_WINDOW_DAYS,
    );

    return {
      ...rate,
      totalBlocksThisWeek,
      daysAvailable,
      confidence: computeConfidence(daysAvailable, TREND_WINDOW_DAYS),
      flags: rate.deltaPercent <= -10 ? ['risk'] : [],
    };
  }

  private async computeJournal(userId: string): Promise<JournalSourceData> {
    const { data: entries } = await this.journalService.history(userId, {
      page: 1,
      pageSize: JOURNAL_ENTRIES_ANALYZED,
    });

    const scored = entries
      .map((entry) => moodScore(entry.mood))
      .filter((score): score is number => score !== null);

    const trend = computeMoodTrend(scored);

    return {
      direction: trend.direction,
      consecutiveDays: trend.consecutiveDays,
      entriesAnalyzed: scored.length,
      latestMood: entries.find((entry) => entry.mood)?.mood ?? null,
      confidence: computeConfidence(scored.length, JOURNAL_ENTRIES_ANALYZED),
      flags: trend.direction === 'DECLINING' ? ['risk'] : [],
    };
  }

  private async computeStreaks(userId: string): Promise<StreaksSourceData> {
    const [overview, today] = await Promise.all([
      this.streaksService.getOverview(userId),
      this.streaksService.getToday(userId),
    ]);

    return {
      hasDailyHabits: overview.hasDailyHabits,
      currentStreak: overview.currentStreak,
      longestStreak: overview.longestStreak,
      isTodaySuccessful: today.isTodaySuccessful,
      freezesRemainingThisMonth: today.freezesRemainingThisMonth,
      confidence: overview.hasDailyHabits ? 0.9 : 0.3,
      flags:
        overview.hasDailyHabits &&
        !today.isTodaySuccessful &&
        overview.currentStreak > 0
          ? ['risk']
          : [],
    };
  }

  private async dailyTaskCompletionPoints(
    userId: string,
    fromDate: Date,
  ): Promise<DailyCompletionPoint[]> {
    const [created, completed] = await Promise.all([
      this.prisma.task.findMany({
        where: { userId, deletedAt: null, createdAt: { gte: fromDate } },
        select: { createdAt: true },
      }),
      this.prisma.task.findMany({
        where: {
          userId,
          deletedAt: null,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: fromDate },
        },
        select: { completedAt: true },
      }),
    ]);

    return buildDailyPoints(
      created.map((task) => task.createdAt),
      completed.map((task) => task.completedAt as Date),
    );
  }

  private async dailyPlannerCompletionPoints(
    userId: string,
    fromDate: Date,
  ): Promise<DailyCompletionPoint[]> {
    const blocks = await this.prisma.plannerBlock.findMany({
      where: { plannerDay: { userId, date: { gte: fromDate } } },
      select: { completed: true, plannerDay: { select: { date: true } } },
    });

    const byDate = new Map<string, { completed: number; total: number }>();
    for (const block of blocks) {
      const date = formatDateOnly(block.plannerDay.date);
      const bucket = byDate.get(date) ?? { completed: 0, total: 0 };
      bucket.total++;
      if (block.completed) {
        bucket.completed++;
      }
      byDate.set(date, bucket);
    }

    return [...byDate.entries()].map(([date, bucket]) => ({
      date,
      completed: bucket.completed,
      total: bucket.total,
    }));
  }

  /** Weekday distribution input for Productivity's "highest-productivity days" — completed Tasks,
   * completed HabitLogs, and completed PlannerBlocks all count as one "productive completion" on
   * their own date. */
  private async combinedCompletionWeekdayDates(
    userId: string,
    fromDate: Date,
  ): Promise<string[]> {
    const [tasks, habitLogs, plannerBlocks] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          userId,
          deletedAt: null,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: fromDate },
        },
        select: { completedAt: true },
      }),
      this.prisma.habitLog.findMany({
        where: { habit: { userId, deletedAt: null }, date: { gte: fromDate } },
        select: { date: true },
      }),
      this.prisma.plannerBlock.findMany({
        where: {
          completed: true,
          plannerDay: { userId, date: { gte: fromDate } },
        },
        select: { plannerDay: { select: { date: true } } },
      }),
    ]);

    return [
      ...tasks.map((task) => formatDateOnly(task.completedAt as Date)),
      ...habitLogs.map((log) => formatDateOnly(log.date)),
      ...plannerBlocks.map((block) => formatDateOnly(block.plannerDay.date)),
    ];
  }

  private async daysOfHistoryAvailable(
    userId: string,
    targetDays: number,
  ): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) {
      return 0;
    }
    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / 86_400_000,
    );
    return Math.max(0, Math.min(targetDays, accountAgeDays));
  }

  private async getTimezone(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    return user?.timezone ?? 'UTC';
  }
}

function buildDailyPoints(
  createdDates: Date[],
  completedDates: Date[],
): DailyCompletionPoint[] {
  const byDate = new Map<string, { completed: number; total: number }>();
  for (const date of createdDates) {
    const key = formatDateOnly(date);
    const bucket = byDate.get(key) ?? { completed: 0, total: 0 };
    bucket.total++;
    byDate.set(key, bucket);
  }
  for (const date of completedDates) {
    const key = formatDateOnly(date);
    const bucket = byDate.get(key) ?? { completed: 0, total: 0 };
    bucket.completed++;
    bucket.total = Math.max(bucket.total, bucket.completed);
    byDate.set(key, bucket);
  }
  return [...byDate.entries()].map(([date, bucket]) => ({ date, ...bucket }));
}

function mergeDailyPoints(
  a: DailyCompletionPoint[],
  b: DailyCompletionPoint[],
): DailyCompletionPoint[] {
  const byDate = new Map<string, { completed: number; total: number }>();
  for (const point of [...a, ...b]) {
    const bucket = byDate.get(point.date) ?? { completed: 0, total: 0 };
    bucket.completed += point.completed;
    bucket.total += point.total;
    byDate.set(point.date, bucket);
  }
  return [...byDate.entries()].map(([date, bucket]) => ({ date, ...bucket }));
}
