import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  GoalStatus,
  InsightStatus,
  PlannerBlockType,
  TaskStatus,
} from '../../../generated/prisma/index.js';
import { AiInsightsService } from '../ai/ai-insights.service.js';
import { CalendarEventsService } from '../calendar/calendar-events.service.js';
import { GoalsService } from '../goals/goals.service.js';
import { HabitsService } from '../habits/habits.service.js';
import { JournalService } from '../journal/journal.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { StreaksService } from '../streaks/streaks.service.js';
import {
  bestWeekdaysByCount,
  computeMoodTrend,
  moodScore,
} from '../ai/utils/ai-metrics.util.js';
import {
  addDaysToDateString,
  formatDateOnly,
  getZonedDateString,
  parseDateOnly,
  zonedWallTimeToUtc,
} from '../planner/utils/timezone.util.js';
import type {
  AnalyticsOverviewResponseDto,
  CalendarAnalyticsResponseDto,
  GoalsAnalyticsResponseDto,
  HabitsAnalyticsResponseDto,
  JournalAnalyticsResponseDto,
  PlannerAnalyticsResponseDto,
  ProductivityAnalyticsResponseDto,
} from './dto/analytics-response.dto.js';
import {
  bucketDatedValues,
  previousRangeOf,
  percentageOf as bucketPercentageOf,
  resolvePeriodRange,
  windowLengthDays,
  buildCompletionPoints,
  type AnalyticsPeriodValue,
  type DatedValue,
} from './utils/analytics-bucket.util.js';
import {
  completionRate,
  computeGoalScore,
  computeJournalScore,
  computeProductivityScore,
} from './utils/analytics-scoring.util.js';

/** Every domain's own trailing lookback for its "recent trend" signals that aren't tied to the
 * requested chart period (Journal's mood trend, the Overview's rolling journal consistency) — the
 * same role AiAnalysisService's own JOURNAL_ENTRIES_ANALYZED/RECENT_WINDOW_DAYS constants play. */
const JOURNAL_TREND_ENTRIES = 14;
const JOURNAL_SCORE_WINDOW_DAYS = 7;

export interface TodayScores {
  snapshotDate: string;
  productivityScore: number;
  habitScore: number;
  plannerScore: number;
  goalScore: number;
  journalScore: number;
  focusMinutes: number;
  streakDays: number;
}

/**
 * The read-only composition engine every `/analytics/*` endpoint is built from — the widest
 * fan-in in this codebase (Tasks/Habits/Planner/Streaks/Goals/Journal/Calendar/Notifications/
 * AiInsights, one wider than AI Coach's own seven), and, like AI Coach, strictly read-only: every
 * sibling-service call here is one that only reads. Metrics no existing method exposes (daily/
 * weekly/monthly time series, per-domain scores) are computed via direct, read-only PrismaService
 * queries scoped by `userId` — the same "cross-cutting query no existing method exposes" reasoning
 * AiAnalysisService's own equivalents already document.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly habitsService: HabitsService,
    private readonly goalsService: GoalsService,
    private readonly streaksService: StreaksService,
    private readonly journalService: JournalService,
    private readonly notificationsService: NotificationsService,
    private readonly calendarEventsService: CalendarEventsService,
    private readonly aiInsightsService: AiInsightsService,
  ) {}

  /** The cheap half of what computeTodayScores needs (just today's date in the user's own
   * timezone) — AnalyticsSnapshotService calls this first to resolve the cache key, and only
   * calls the expensive computeTodayScores below on an actual cache miss. */
  async getTodayDateString(userId: string): Promise<string> {
    const timezone = await this.getTimezone(userId);
    return getZonedDateString(new Date(), timezone);
  }

  /** Today's five 0-100 scores + focusMinutes/streakDays — what AnalyticsSnapshotService caches
   * into AnalyticsSnapshot. Always computed fresh; caching is that service's own concern, not
   * this one's. */
  async computeTodayScores(userId: string): Promise<TodayScores> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);

    const [
      taskPoints,
      plannerPoints,
      habitSummary,
      activeGoals,
      journalConsistency,
      streakOverview,
      focusMinutes,
    ] = await Promise.all([
      this.taskCompletionPoints(userId, todayStr, todayStr, timezone),
      this.plannerCompletionPoints(userId, todayStr, todayStr),
      this.habitsService.summary(userId),
      this.activeGoalsWithProgress(userId),
      this.journalConsistencyForWindow(
        userId,
        todayStr,
        JOURNAL_SCORE_WINDOW_DAYS,
      ),
      this.streaksService.getOverview(userId),
      this.focusMinutesForRange(userId, todayStr, todayStr),
    ]);

    const taskRate = completionRate(sumValue(taskPoints), sumTotal(taskPoints));
    const plannerRate = completionRate(
      sumValue(plannerPoints),
      sumTotal(plannerPoints),
    );

    return {
      snapshotDate: todayStr,
      productivityScore: computeProductivityScore(
        taskRate,
        plannerRate,
        habitSummary.completionPercentage,
      ),
      habitScore: habitSummary.completionPercentage,
      plannerScore: plannerRate,
      goalScore: computeGoalScore(activeGoals),
      journalScore: computeJournalScore(
        journalConsistency.daysWithEntry,
        journalConsistency.windowDays,
      ),
      focusMinutes,
      streakDays: streakOverview.currentStreak,
    };
  }

  /** The two live counts Overview enriches every snapshot with — never cached (cheap counts, not
   * expensive aggregations), per this milestone's own "no duplicate storage" business rule. */
  async getOverviewEnrichment(
    userId: string,
  ): Promise<
    Pick<
      AnalyticsOverviewResponseDto,
      'activeInsightCount' | 'unreadNotificationCount'
    >
  > {
    const [insights, unread] = await Promise.all([
      this.aiInsightsService.findAll(userId, {
        status: InsightStatus.ACTIVE,
        page: 1,
        pageSize: 1,
      }),
      this.notificationsService.findUnread(userId),
    ]);
    return {
      activeInsightCount: insights.meta.total,
      unreadNotificationCount: unread.length,
    };
  }

  async getProductivity(
    userId: string,
    period: AnalyticsPeriodValue,
  ): Promise<ProductivityAnalyticsResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const range = resolvePeriodRange(period, todayStr);
    const prevRange = previousRangeOf(range);

    const [
      taskPoints,
      plannerPoints,
      weekdayDates,
      prevTaskPoints,
      prevPlannerPoints,
    ] = await Promise.all([
      this.taskCompletionPoints(userId, range.from, range.to, timezone),
      this.plannerCompletionPoints(userId, range.from, range.to),
      this.combinedCompletionWeekdays(userId, range.from, range.to, timezone),
      this.taskCompletionPoints(userId, prevRange.from, prevRange.to, timezone),
      this.plannerCompletionPoints(userId, prevRange.from, prevRange.to),
    ]);

    const merged = mergePoints(taskPoints, plannerPoints);
    const series = bucketDatedValues(
      merged,
      range.from,
      range.to,
      range.granularity,
    );
    const averageCompletionRate = bucketPercentageOf(
      sumValue(merged),
      sumTotal(merged),
    );

    const prevMerged = mergePoints(prevTaskPoints, prevPlannerPoints);
    const previousRate = bucketPercentageOf(
      sumValue(prevMerged),
      sumTotal(prevMerged),
    );

    return {
      period,
      from: range.from,
      to: range.to,
      series,
      summary: {
        averageCompletionRate,
        deltaPercent: averageCompletionRate - previousRate,
        bestWeekdays: bestWeekdaysByCount(weekdayDates),
      },
    };
  }

  async getHabits(
    userId: string,
    period: AnalyticsPeriodValue,
  ): Promise<HabitsAnalyticsResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const range = resolvePeriodRange(period, todayStr);

    const [logs, activeHabitsCount] = await Promise.all([
      this.prisma.habitLog.findMany({
        where: {
          habit: { userId, deletedAt: null },
          date: {
            gte: parseDateOnly(range.from),
            lte: parseDateOnly(range.to),
          },
          completedCount: { gt: 0 },
        },
        select: { date: true },
      }),
      this.prisma.habit.count({
        where: { userId, deletedAt: null, isActive: true },
      }),
    ]);

    const byDate = new Map<string, number>();
    for (const log of logs) {
      const key = formatDateOnly(log.date);
      byDate.set(key, (byDate.get(key) ?? 0) + 1);
    }
    const points: DatedValue[] = [...byDate.entries()].map(([date, value]) => ({
      date,
      value,
      total: activeHabitsCount,
    }));
    const series = bucketDatedValues(
      points,
      range.from,
      range.to,
      range.granularity,
    );

    const totalPossible = activeHabitsCount * windowLengthDays(range);
    const averageCompletionRate = bucketPercentageOf(
      logs.length,
      totalPossible,
    );

    return {
      period,
      from: range.from,
      to: range.to,
      series,
      summary: {
        averageCompletionRate,
        totalActiveHabits: activeHabitsCount,
        totalLogs: logs.length,
      },
    };
  }

  async getGoals(
    userId: string,
    period: AnalyticsPeriodValue,
  ): Promise<GoalsAnalyticsResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const range = resolvePeriodRange(period, todayStr);
    const { start, endExclusive } = this.instantBounds(
      range.from,
      range.to,
      timezone,
    );

    const [completedInRange, activeGoals, completedTotal] = await Promise.all([
      this.prisma.goal.findMany({
        where: {
          userId,
          deletedAt: null,
          status: GoalStatus.COMPLETED,
          updatedAt: { gte: start, lt: endExclusive },
        },
        select: { updatedAt: true },
      }),
      this.activeGoalsWithProgress(userId),
      this.prisma.goal.count({
        where: { userId, deletedAt: null, status: GoalStatus.COMPLETED },
      }),
    ]);

    const points: DatedValue[] = completedInRange.map((goal) => ({
      date: formatDateOnly(goal.updatedAt),
      value: 1,
    }));
    const series = bucketDatedValues(
      points,
      range.from,
      range.to,
      range.granularity,
    );

    const activeCount = activeGoals.length;

    return {
      period,
      from: range.from,
      to: range.to,
      series,
      summary: {
        activeCount,
        completedCount: completedTotal,
        completionRate: bucketPercentageOf(
          completedTotal,
          completedTotal + activeCount,
        ),
        averageProgressPercent: computeGoalScore(activeGoals),
      },
    };
  }

  async getPlanner(
    userId: string,
    period: AnalyticsPeriodValue,
  ): Promise<PlannerAnalyticsResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const range = resolvePeriodRange(period, todayStr);

    const blocks = await this.prisma.plannerBlock.findMany({
      where: {
        plannerDay: {
          userId,
          date: {
            gte: parseDateOnly(range.from),
            lte: parseDateOnly(range.to),
          },
        },
      },
      select: {
        completed: true,
        duration: true,
        type: true,
        plannerDay: { select: { date: true } },
      },
    });

    const byDate = new Map<string, { value: number; total: number }>();
    let totalFocusMinutes = 0;
    let totalBlocksCompleted = 0;
    for (const block of blocks) {
      const key = formatDateOnly(block.plannerDay.date);
      const bucket = byDate.get(key) ?? { value: 0, total: 0 };
      bucket.total += block.duration;
      if (block.completed) {
        bucket.value += block.duration;
        totalBlocksCompleted++;
        if (block.type === PlannerBlockType.FOCUS) {
          totalFocusMinutes += block.duration;
        }
      }
      byDate.set(key, bucket);
    }
    const points: DatedValue[] = [...byDate.entries()].map(
      ([date, { value, total }]) => ({
        date,
        value,
        total,
      }),
    );
    const series = bucketDatedValues(
      points,
      range.from,
      range.to,
      range.granularity,
    );

    return {
      period,
      from: range.from,
      to: range.to,
      series,
      summary: {
        averageUtilizationRate: bucketPercentageOf(
          sumValue(points),
          sumTotal(points),
        ),
        totalFocusMinutes,
        totalBlocksCompleted,
      },
    };
  }

  async getJournal(
    userId: string,
    period: AnalyticsPeriodValue,
  ): Promise<JournalAnalyticsResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const range = resolvePeriodRange(period, todayStr);

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: parseDateOnly(range.from), lte: parseDateOnly(range.to) },
      },
      select: { date: true, mood: true },
    });

    const byDate = new Map<
      string,
      { scoreSum: number; scored: number; count: number }
    >();
    for (const entry of entries) {
      const key = formatDateOnly(entry.date);
      const bucket = byDate.get(key) ?? { scoreSum: 0, scored: 0, count: 0 };
      bucket.count++;
      const score = moodScore(entry.mood);
      if (score !== null) {
        bucket.scoreSum += score;
        bucket.scored++;
      }
      byDate.set(key, bucket);
    }
    const points: DatedValue[] = [...byDate.entries()].map(
      ([date, { scoreSum, scored, count }]) => ({
        date,
        value: scored === 0 ? 0 : Math.round((scoreSum / scored) * 10) / 10,
        total: count,
      }),
    );
    const series = bucketDatedValues(
      points,
      range.from,
      range.to,
      range.granularity,
    );

    const consistencyRate = completionRate(
      byDate.size,
      windowLengthDays(range),
    );

    // Mood trend is a recent-trend signal, independent of the requested chart period — the same
    // "look at the last N entries regardless of the caller's own window" shape
    // AiAnalysisService.computeJournal already establishes.
    const { data: recentEntries } = await this.journalService.history(userId, {
      page: 1,
      pageSize: JOURNAL_TREND_ENTRIES,
    });
    const scores = recentEntries
      .map((entry) => moodScore(entry.mood))
      .filter((score): score is number => score !== null);
    const trend = computeMoodTrend(scores);
    const averageMoodScore =
      scores.length === 0
        ? null
        : Math.round(
            (scores.reduce((sum, score) => sum + score, 0) / scores.length) *
              10,
          ) / 10;

    return {
      period,
      from: range.from,
      to: range.to,
      series,
      summary: {
        consistencyRate,
        moodTrendDirection: trend.direction,
        moodTrendConsecutiveDays: trend.consecutiveDays,
        averageMoodScore,
      },
    };
  }

  async getCalendar(
    userId: string,
    period: AnalyticsPeriodValue,
  ): Promise<CalendarAnalyticsResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const range = resolvePeriodRange(period, todayStr);
    const { start, endExclusive } = this.instantBounds(
      range.from,
      range.to,
      timezone,
    );

    const events = await this.prisma.calendarEvent.findMany({
      where: {
        calendar: { userId },
        startTime: { gte: start, lt: endExclusive },
      },
      select: { startTime: true },
    });

    const byDate = new Map<string, number>();
    for (const event of events) {
      const key = formatDateOnly(event.startTime);
      byDate.set(key, (byDate.get(key) ?? 0) + 1);
    }
    const points: DatedValue[] = [...byDate.entries()].map(([date, value]) => ({
      date,
      value,
    }));
    const series = bucketDatedValues(
      points,
      range.from,
      range.to,
      range.granularity,
    );

    const upcoming = await this.calendarEventsService.findAll(userId, {
      from: new Date().toISOString(),
      page: 1,
      pageSize: 1,
    });

    const windowDays = windowLengthDays(range);
    const busiestWeekdays = bestWeekdaysByCount(
      events.map((event) => formatDateOnly(event.startTime)),
    );

    return {
      period,
      from: range.from,
      to: range.to,
      series,
      summary: {
        totalEvents: events.length,
        upcomingEvents: upcoming.meta.total,
        busiestWeekday: busiestWeekdays[0] ?? null,
        averageEventsPerDay:
          windowDays === 0
            ? 0
            : Math.round((events.length / windowDays) * 10) / 10,
      },
    };
  }

  private async activeGoalsWithProgress(
    userId: string,
  ): Promise<{ progressPercent: number }[]> {
    const { data } = await this.goalsService.findAll(userId, {
      status: GoalStatus.ACTIVE,
      archived: false,
      page: 1,
      pageSize: 100,
    });
    return data.map((goal) => ({ progressPercent: goal.progressPercent }));
  }

  private async journalConsistencyForWindow(
    userId: string,
    todayStr: string,
    windowDays: number,
  ): Promise<{ daysWithEntry: number; windowDays: number }> {
    const fromStr = addDaysToDateString(todayStr, -(windowDays - 1));
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: parseDateOnly(fromStr), lte: parseDateOnly(todayStr) },
      },
      select: { date: true },
    });
    const daysWithEntry = new Set(
      entries.map((entry) => formatDateOnly(entry.date)),
    ).size;
    return { daysWithEntry, windowDays };
  }

  private async focusMinutesForRange(
    userId: string,
    fromStr: string,
    toStr: string,
  ): Promise<number> {
    const blocks = await this.prisma.plannerBlock.findMany({
      where: {
        type: PlannerBlockType.FOCUS,
        completed: true,
        plannerDay: {
          userId,
          date: { gte: parseDateOnly(fromStr), lte: parseDateOnly(toStr) },
        },
      },
      select: { duration: true },
    });
    return blocks.reduce((sum, block) => sum + block.duration, 0);
  }

  private async taskCompletionPoints(
    userId: string,
    fromStr: string,
    toStr: string,
    timezone: string,
  ): Promise<DatedValue[]> {
    const { start, endExclusive } = this.instantBounds(
      fromStr,
      toStr,
      timezone,
    );
    const [created, completed] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          userId,
          deletedAt: null,
          createdAt: { gte: start, lt: endExclusive },
        },
        select: { createdAt: true },
      }),
      this.prisma.task.findMany({
        where: {
          userId,
          deletedAt: null,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: start, lt: endExclusive },
        },
        select: { completedAt: true },
      }),
    ]);
    return buildCompletionPoints(
      created.map((task) => task.createdAt),
      completed.map((task) => task.completedAt as Date),
    );
  }

  private async plannerCompletionPoints(
    userId: string,
    fromStr: string,
    toStr: string,
  ): Promise<DatedValue[]> {
    const blocks = await this.prisma.plannerBlock.findMany({
      where: {
        plannerDay: {
          userId,
          date: { gte: parseDateOnly(fromStr), lte: parseDateOnly(toStr) },
        },
      },
      select: { completed: true, plannerDay: { select: { date: true } } },
    });

    const byDate = new Map<string, { value: number; total: number }>();
    for (const block of blocks) {
      const key = formatDateOnly(block.plannerDay.date);
      const bucket = byDate.get(key) ?? { value: 0, total: 0 };
      bucket.total++;
      if (block.completed) {
        bucket.value++;
      }
      byDate.set(key, bucket);
    }
    return [...byDate.entries()].map(([date, { value, total }]) => ({
      date,
      value,
      total,
    }));
  }

  /** Weekday distribution input for "highest-productivity days" — completed Tasks and completed
   * PlannerBlocks each count as one "productive completion" on their own date, the same shape
   * AiAnalysisService.combinedCompletionWeekdayDates already establishes (that one also folds in
   * HabitLogs; Analytics' own Habits domain is charted separately, so Productivity here sticks to
   * the two domains it actually charts). */
  private async combinedCompletionWeekdays(
    userId: string,
    fromStr: string,
    toStr: string,
    timezone: string,
  ): Promise<string[]> {
    const { start, endExclusive } = this.instantBounds(
      fromStr,
      toStr,
      timezone,
    );
    const [tasks, plannerBlocks] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          userId,
          deletedAt: null,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: start, lt: endExclusive },
        },
        select: { completedAt: true },
      }),
      this.prisma.plannerBlock.findMany({
        where: {
          completed: true,
          plannerDay: {
            userId,
            date: { gte: parseDateOnly(fromStr), lte: parseDateOnly(toStr) },
          },
        },
        select: { plannerDay: { select: { date: true } } },
      }),
    ]);
    return [
      ...tasks.map((task) => formatDateOnly(task.completedAt as Date)),
      ...plannerBlocks.map((block) => formatDateOnly(block.plannerDay.date)),
    ];
  }

  private instantBounds(
    fromStr: string,
    toStr: string,
    timezone: string,
  ): { start: Date; endExclusive: Date } {
    return {
      start: zonedWallTimeToUtc(fromStr, '00:00', timezone),
      endExclusive: zonedWallTimeToUtc(
        addDaysToDateString(toStr, 1),
        '00:00',
        timezone,
      ),
    };
  }

  private async getTimezone(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    return user?.timezone ?? 'UTC';
  }
}

function sumValue(points: DatedValue[]): number {
  return points.reduce((sum, point) => sum + point.value, 0);
}

function sumTotal(points: DatedValue[]): number {
  return points.reduce((sum, point) => sum + (point.total ?? 0), 0);
}

function mergePoints(a: DatedValue[], b: DatedValue[]): DatedValue[] {
  const byDate = new Map<string, { value: number; total: number }>();
  for (const point of [...a, ...b]) {
    const bucket = byDate.get(point.date) ?? { value: 0, total: 0 };
    bucket.value += point.value;
    bucket.total += point.total ?? 0;
    byDate.set(point.date, bucket);
  }
  return [...byDate.entries()].map(([date, { value, total }]) => ({
    date,
    value,
    total,
  }));
}
