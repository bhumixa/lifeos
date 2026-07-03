import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  HabitFrequency,
  PlannerBlockType,
  type Habit,
} from '../../../generated/prisma/index.js';
import { TasksService } from '../tasks/tasks.service.js';
import { PlannerService } from '../planner/planner.service.js';
import { FreezeDaysService } from './freeze-days.service.js';
import { AchievementsService } from './achievements.service.js';
import type {
  HabitStreakResponseDto,
  StreaksOverviewResponseDto,
} from './dto/habit-streak-response.dto.js';
import type { StreaksTodayResponseDto } from './dto/streaks-today-response.dto.js';
import type { StreaksStatisticsResponseDto } from './dto/streaks-statistics-response.dto.js';
import type {
  HabitStreakDetailResponseDto,
  HabitStreakPeriodDto,
} from './dto/habit-streak-detail-response.dto.js';
import {
  addDaysToDateString,
  formatDateOnly,
  getZonedDateString,
  getZonedHour,
  parseDateOnly,
} from '../planner/utils/timezone.util.js';
import {
  buildDailySuccessHistory,
  buildPeriodHistory,
  computeConsistencyPercent,
  computeCurrentStreak,
  computeLongestStreak,
  computeSuccessRate,
  isPerfectMonth,
  isPerfectWeek,
  nextMonthStart,
  previousMonthStart,
  startOfMonth,
  startOfWeek,
  toDailySuccessLike,
  type DailyHabitDefinition,
  type DailyHabitLog,
  type DailySuccess,
} from './utils/streak-calculator.util.js';
import { computeTotalXp } from './utils/xp-calculator.util.js';
import type { AchievementContext } from './utils/achievement-definitions.js';

/** How far back the day-level consistency engine looks, in days. A generous ~13 months rather
 * than a truly unbounded scan of a user's whole history — nothing here is stored (see the schema
 * comment on Achievement), so every request recomputes this window from HabitLog rows on every
 * read; an unbounded lookback would make that recomputation slower for no benefit a foundation
 * milestone needs (a genuinely multi-year streak would undercount past this point — a documented
 * scope limit, not a bug, and the natural first candidate for a future persisted rollup job, the
 * same role docs/06-database-design.md's original Streak table would have played). */
const STREAK_LOOKBACK_DAYS = 400;
/** Same idea, expressed in periods rather than days, for a single habit's own WEEKLY/MONTHLY
 * streak (Section: getHabitStreak) — 60 weeks/months is comfortably more than a foundation
 * milestone's "current/longest streak" needs to feel correct. */
const MAX_PERIODS = 60;
/** How many trailing days GET /streaks/statistics's `dailyHistory` returns for the Weekly/Monthly
 * Heatmap — independent of (and smaller than) STREAK_LOOKBACK_DAYS, which only bounds the
 * *calculation* window; the heatmap doesn't need 13 months of cells to be useful. */
const DAILY_HISTORY_RESPONSE_DAYS = 90;
const MORNING_HOUR_CUTOFF = 7;
const NIGHT_HOUR_CUTOFF = 22;

/**
 * The Streak Engine's own primary domain is Habit/HabitLog, read directly via Prisma the same way
 * HabitsService itself does — not through HabitsService, because none of its existing read
 * endpoints (today/summary/history) expose the unbounded multi-day, multi-habit log range this
 * module's consistency math needs (see docs/05-architecture.md for the fuller rationale).
 * Task/Planner completion *counts* (needed only for XP/achievement totals, not for the streak
 * math itself) are reused through TasksService.countCompleted/PlannerService.countCompletedBlocks
 * instead, following the architecture doc's "reuse services" rule for everything outside this
 * module's own domain.
 *
 * Every calculation is derived on read — see the schema comment on Achievement — except the
 * achievement *unlock instant*, which AchievementsService persists as a side effect of
 * GET /streaks/statistics (the one endpoint that computes every input every achievement condition
 * needs).
 */
@Injectable()
export class StreaksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly plannerService: PlannerService,
    private readonly freezeDaysService: FreezeDaysService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async getOverview(userId: string): Promise<StreaksOverviewResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const activeHabits = await this.getActiveHabits(userId);
    const dailyHabits = activeHabits.filter(
      (habit) => habit.targetFrequency === HabitFrequency.DAILY,
    );
    const hasDailyHabits = dailyHabits.length > 0;

    const overallHistory = hasDailyHabits
      ? await this.getDailyHistory(userId, timezone, todayStr, dailyHabits)
      : [];

    // One computeHabitStreak call per active habit — each does its own bounded Prisma query, so
    // this is O(habits) queries rather than one big one. Acceptable for a foundation milestone's
    // typical per-user habit counts; a batched version would be the natural first optimization if
    // this ever shows up as a hot path.
    const habits = await Promise.all(
      activeHabits.map((habit) =>
        this.toHabitStreakSummary(habit, timezone, todayStr),
      ),
    );

    return {
      hasDailyHabits,
      currentStreak: hasDailyHabits
        ? computeCurrentStreak(overallHistory, todayStr)
        : 0,
      longestStreak: hasDailyHabits ? computeLongestStreak(overallHistory) : 0,
      habits,
    };
  }

  async getToday(userId: string): Promise<StreaksTodayResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const activeHabits = await this.getActiveHabits(userId);
    const dailyHabits = activeHabits.filter(
      (habit) => habit.targetFrequency === HabitFrequency.DAILY,
    );
    const freezeStatus = await this.freezeDaysService.getStatus(userId);

    if (dailyHabits.length === 0) {
      return {
        date: todayStr,
        hasDailyHabits: false,
        totalDailyHabits: 0,
        completedDailyHabits: 0,
        remainingHabitIds: [],
        isTodaySuccessful: false,
        isFrozenToday: freezeStatus.isDateFrozen,
        freezesRemainingThisMonth: freezeStatus.remainingThisMonth,
      };
    }

    const logsToday = await this.prisma.habitLog.findMany({
      where: {
        habitId: { in: dailyHabits.map((habit) => habit.id) },
        date: parseDateOnly(todayStr),
      },
    });
    const countByHabitId = new Map(
      logsToday.map((log) => [log.habitId, log.completedCount]),
    );

    const completedHabitIds = new Set(
      dailyHabits
        .filter(
          (habit) => (countByHabitId.get(habit.id) ?? 0) >= habit.targetCount,
        )
        .map((habit) => habit.id),
    );
    const remainingHabitIds = dailyHabits
      .map((habit) => habit.id)
      .filter((id) => !completedHabitIds.has(id));

    const isTodaySuccessful =
      completedHabitIds.size === dailyHabits.length ||
      freezeStatus.isDateFrozen;

    return {
      date: todayStr,
      hasDailyHabits: true,
      totalDailyHabits: dailyHabits.length,
      completedDailyHabits: completedHabitIds.size,
      remainingHabitIds,
      isTodaySuccessful,
      isFrozenToday: freezeStatus.isDateFrozen,
      freezesRemainingThisMonth: freezeStatus.remainingThisMonth,
    };
  }

  /** The one endpoint that computes every XP/achievement input, and so the one place achievement
   * evaluation is triggered — see the class doc on AchievementsService. */
  async getStatistics(userId: string): Promise<StreaksStatisticsResponseDto> {
    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const activeHabits = await this.getActiveHabits(userId);
    const dailyHabits = activeHabits.filter(
      (habit) => habit.targetFrequency === HabitFrequency.DAILY,
    );
    const hasDailyHabits = dailyHabits.length > 0;

    const history = hasDailyHabits
      ? await this.getDailyHistory(userId, timezone, todayStr, dailyHabits)
      : [];

    const currentStreak = hasDailyHabits
      ? computeCurrentStreak(history, todayStr)
      : 0;
    const longestStreak = hasDailyHabits ? computeLongestStreak(history) : 0;
    const weeklyConsistency = hasDailyHabits
      ? computeConsistencyPercent(history, 7)
      : 0;
    const monthlyConsistency = hasDailyHabits
      ? computeConsistencyPercent(history, 30)
      : 0;
    const successRate = hasDailyHabits ? computeSuccessRate(history) : 0;
    const isPerfectWeekFlag = hasDailyHabits
      ? isPerfectWeek(history, todayStr)
      : false;
    const isPerfectMonthFlag = hasDailyHabits
      ? isPerfectMonth(history, todayStr)
      : false;
    const perfectDays = hasDailyHabits
      ? history.filter((day) => day.successful).length
      : 0;

    const [
      totalHabitCompletions,
      totalTasksCompleted,
      totalRoutineCompletions,
      totalCompletedPlannerBlocks,
      habitLogTimestamps,
    ] = await Promise.all([
      this.prisma.habitLog.count({
        where: { habit: { userId, deletedAt: null } },
      }),
      this.tasksService.countCompleted(userId),
      this.plannerService.countCompletedBlocks(
        userId,
        PlannerBlockType.ROUTINE,
      ),
      this.plannerService.countCompletedBlocks(userId),
      this.prisma.habitLog.findMany({
        where: { habit: { userId, deletedAt: null } },
        select: { createdAt: true },
      }),
    ]);

    const morningHabitLogCount = habitLogTimestamps.filter(
      (log) => getZonedHour(log.createdAt, timezone) < MORNING_HOUR_CUTOFF,
    ).length;
    const nightHabitLogCount = habitLogTimestamps.filter(
      (log) => getZonedHour(log.createdAt, timezone) >= NIGHT_HOUR_CUTOFF,
    ).length;

    const xpEarned = computeTotalXp({
      tasksCompleted: totalTasksCompleted,
      habitCompletions: totalHabitCompletions,
      routineCompletions: totalRoutineCompletions,
      perfectDays,
    });

    const achievementContext: AchievementContext = {
      totalHabitCompletions,
      totalTasksCompleted,
      totalRoutineCompletions,
      totalCompletedPlannerBlocks,
      longestStreak,
      isPerfectWeek: isPerfectWeekFlag,
      isPerfectMonth: isPerfectMonthFlag,
      morningHabitLogCount,
      nightHabitLogCount,
    };
    await this.achievementsService.evaluateAndUnlock(
      userId,
      achievementContext,
    );

    const freezeStatus = await this.freezeDaysService.getStatus(userId);

    return {
      hasDailyHabits,
      currentStreak,
      longestStreak,
      weeklyConsistency,
      monthlyConsistency,
      successRate,
      isPerfectWeek: isPerfectWeekFlag,
      isPerfectMonth: isPerfectMonthFlag,
      xpEarned,
      totals: {
        tasksCompleted: totalTasksCompleted,
        habitCompletions: totalHabitCompletions,
        routineCompletions: totalRoutineCompletions,
        perfectDays,
      },
      freezeDays: {
        usedThisMonth: freezeStatus.usedThisMonth,
        remainingThisMonth: freezeStatus.remainingThisMonth,
        monthlyQuota: freezeStatus.monthlyQuota,
      },
      dailyHistory: history.slice(-DAILY_HISTORY_RESPONSE_DAYS).map((day) => ({
        date: day.date,
        completedCount: day.completedCount,
        totalCount: day.totalCount,
        successful: day.successful,
      })),
    };
  }

  async getHabitStreak(
    userId: string,
    habitId: string,
  ): Promise<HabitStreakDetailResponseDto> {
    const habit = await this.prisma.habit.findFirst({
      where: { id: habitId, userId, deletedAt: null },
    });
    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    const timezone = await this.getTimezone(userId);
    const todayStr = getZonedDateString(new Date(), timezone);
    const detail = await this.computeHabitStreak(habit, timezone, todayStr);

    return {
      habitId: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      targetFrequency: habit.targetFrequency,
      targetCount: habit.targetCount,
      currentStreak: detail.currentStreak,
      longestStreak: detail.longestStreak,
      currentPeriodCount: detail.currentPeriodCount,
      currentPeriodMet: detail.currentPeriodMet,
      history: detail.history.slice(-MAX_PERIODS),
    };
  }

  private async toHabitStreakSummary(
    habit: Habit,
    timezone: string,
    todayStr: string,
  ): Promise<HabitStreakResponseDto> {
    const detail = await this.computeHabitStreak(habit, timezone, todayStr);
    return {
      habitId: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      targetFrequency: habit.targetFrequency,
      currentStreak: detail.currentStreak,
      longestStreak: detail.longestStreak,
      currentPeriodMet: detail.currentPeriodMet,
    };
  }

  /** Per-habit streak, period-aware: DAILY habits get a day-level walk (reusing the same
   * `buildDailySuccessHistory`/`computeCurrentStreak`/`computeLongestStreak` the overall
   * consistency engine uses, scoped to this one habit); WEEKLY/MONTHLY habits get a
   * calendar-week/month walk instead, since a day isn't their period. FreezeDay only ever applies
   * to the DAILY case — freezing a whole missed week/month isn't what the mechanic is for. */
  private async computeHabitStreak(
    habit: Habit,
    timezone: string,
    todayStr: string,
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    currentPeriodCount: number;
    currentPeriodMet: boolean;
    history: HabitStreakPeriodDto[];
  }> {
    if (habit.targetFrequency === HabitFrequency.DAILY) {
      return this.computeDailyHabitStreak(habit, timezone, todayStr);
    }
    return this.computePeriodHabitStreak(habit, todayStr);
  }

  private async computeDailyHabitStreak(
    habit: Habit,
    timezone: string,
    todayStr: string,
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    currentPeriodCount: number;
    currentPeriodMet: boolean;
    history: HabitStreakPeriodDto[];
  }> {
    const createdAtDateStr = getZonedDateString(habit.createdAt, timezone);
    const lookbackFloor = addDaysToDateString(todayStr, -STREAK_LOOKBACK_DAYS);
    const fromDateStr =
      createdAtDateStr > lookbackFloor ? createdAtDateStr : lookbackFloor;

    const [logs, frozenDates] = await Promise.all([
      this.prisma.habitLog.findMany({
        where: { habitId: habit.id, date: { gte: parseDateOnly(fromDateStr) } },
      }),
      this.freezeDaysService.getFrozenDates(habit.userId, fromDateStr),
    ]);

    const habitDef: DailyHabitDefinition = {
      id: habit.id,
      targetCount: habit.targetCount,
      createdAtDateStr,
    };
    const logDefs: DailyHabitLog[] = logs.map((log) => ({
      habitId: log.habitId,
      date: formatDateOnly(log.date),
      completedCount: log.completedCount,
    }));

    const dayHistory: DailySuccess[] = buildDailySuccessHistory(
      [habitDef],
      logDefs,
      frozenDates,
      fromDateStr,
      todayStr,
    );

    const logByDate = new Map(
      logDefs.map((log) => [log.date, log.completedCount]),
    );
    const history: HabitStreakPeriodDto[] = dayHistory.map((day) => ({
      periodStart: day.date,
      completedCount: logByDate.get(day.date) ?? 0,
      met: day.successful,
    }));

    const todayCount = logByDate.get(todayStr) ?? 0;

    return {
      currentStreak: computeCurrentStreak(dayHistory, todayStr),
      longestStreak: computeLongestStreak(dayHistory),
      currentPeriodCount: todayCount,
      currentPeriodMet: todayCount >= habit.targetCount,
      history,
    };
  }

  private async computePeriodHabitStreak(
    habit: Habit,
    todayStr: string,
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    currentPeriodCount: number;
    currentPeriodMet: boolean;
    history: HabitStreakPeriodDto[];
  }> {
    const isWeekly = habit.targetFrequency === HabitFrequency.WEEKLY;
    const currentPeriodStart = isWeekly
      ? startOfWeek(todayStr)
      : startOfMonth(todayStr);
    const createdAtDateStr = formatDateOnly(habit.createdAt);
    const earliestPeriodStart = isWeekly
      ? startOfWeek(createdAtDateStr)
      : startOfMonth(createdAtDateStr);
    const stepBack = isWeekly
      ? (start: string) => addDaysToDateString(start, -7)
      : previousMonthStart;
    const periodEndExclusive = isWeekly
      ? (start: string) => addDaysToDateString(start, 7)
      : nextMonthStart;

    const periodStarts = this.buildPeriodStarts(
      currentPeriodStart,
      earliestPeriodStart,
      stepBack,
      MAX_PERIODS,
    );

    const logs = await this.prisma.habitLog.findMany({
      where: {
        habitId: habit.id,
        date: { gte: parseDateOnly(periodStarts[0]) },
      },
    });
    const logDefs = logs.map((log) => ({
      date: formatDateOnly(log.date),
      completedCount: log.completedCount,
    }));

    const periods = buildPeriodHistory(
      logDefs,
      habit.targetCount,
      periodStarts,
      periodEndExclusive,
    );
    const successLike = toDailySuccessLike(periods);
    const currentPeriod = periods[periods.length - 1];

    return {
      currentStreak: computeCurrentStreak(successLike, currentPeriodStart),
      longestStreak: computeLongestStreak(successLike),
      currentPeriodCount: currentPeriod?.completedCount ?? 0,
      currentPeriodMet: currentPeriod?.met ?? false,
      history: periods.map((period) => ({
        periodStart: period.periodStart,
        completedCount: period.completedCount,
        met: period.met,
      })),
    };
  }

  private buildPeriodStarts(
    currentPeriodStart: string,
    earliestPeriodStart: string,
    stepBack: (periodStart: string) => string,
    maxPeriods: number,
  ): string[] {
    const starts: string[] = [currentPeriodStart];
    let cursor = currentPeriodStart;
    for (let i = 1; i < maxPeriods; i++) {
      const prev = stepBack(cursor);
      if (prev < earliestPeriodStart) {
        break;
      }
      starts.unshift(prev);
      cursor = prev;
    }
    return starts;
  }

  private async getDailyHistory(
    userId: string,
    timezone: string,
    todayStr: string,
    dailyHabits: Habit[],
  ): Promise<DailySuccess[]> {
    if (dailyHabits.length === 0) {
      return [];
    }

    const habitDefs: DailyHabitDefinition[] = dailyHabits.map((habit) => ({
      id: habit.id,
      targetCount: habit.targetCount,
      createdAtDateStr: getZonedDateString(habit.createdAt, timezone),
    }));
    const earliestCreatedDateStr = habitDefs.reduce(
      (earliest, def) =>
        def.createdAtDateStr < earliest ? def.createdAtDateStr : earliest,
      habitDefs[0].createdAtDateStr,
    );
    const lookbackFloor = addDaysToDateString(todayStr, -STREAK_LOOKBACK_DAYS);
    const fromDateStr =
      earliestCreatedDateStr > lookbackFloor
        ? earliestCreatedDateStr
        : lookbackFloor;

    const [logs, frozenDates] = await Promise.all([
      this.prisma.habitLog.findMany({
        where: {
          habitId: { in: dailyHabits.map((habit) => habit.id) },
          date: { gte: parseDateOnly(fromDateStr) },
        },
      }),
      this.freezeDaysService.getFrozenDates(userId, fromDateStr),
    ]);
    const logDefs: DailyHabitLog[] = logs.map((log) => ({
      habitId: log.habitId,
      date: formatDateOnly(log.date),
      completedCount: log.completedCount,
    }));

    return buildDailySuccessHistory(
      habitDefs,
      logDefs,
      frozenDates,
      fromDateStr,
      todayStr,
    );
  }

  private getActiveHabits(userId: string): Promise<Habit[]> {
    return this.prisma.habit.findMany({
      where: { userId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Same fallback-to-UTC rationale as PlannerService.getTimezone. */
  private async getTimezone(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    return user?.timezone ?? 'UTC';
  }
}
