import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/index.js';
import { parseDateOnly } from '../planner/utils/timezone.util.js';
import { AnalyticsService, type TodayScores } from './analytics.service.js';

export interface SnapshotResult extends TodayScores {
  cached: boolean;
}

/**
 * The optional read-through cache in front of AnalyticsService.computeTodayScores — this
 * milestone's own business rule ("Snapshots are optional caching only") means nothing else in
 * this module depends on a row existing here: `getOrCreate` reads one if present (cache hit) and
 * otherwise computes the same scores fresh and persists them (cache miss, then warm), so a
 * missing/deleted AnalyticsSnapshot row is never a correctness bug, only a slower read. Reuses
 * `(userId, snapshotDate)`'s own unique constraint for the "find-or-create on first read"
 * convention PlannerDay/HabitLog/NotificationPreference already establish for their own per-user
 * rows.
 */
@Injectable()
export class AnalyticsSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getOrCreateToday(userId: string): Promise<SnapshotResult> {
    const todayStr = await this.analytics.getTodayDateString(userId);
    const snapshotDate = parseDateOnly(todayStr);

    const existing = await this.prisma.analyticsSnapshot.findUnique({
      where: { userId_snapshotDate: { userId, snapshotDate } },
    });
    if (existing) {
      return { ...toScores(existing), cached: true };
    }

    // Cache miss — only now does the expensive cross-module aggregation actually run.
    const scores = await this.analytics.computeTodayScores(userId);
    try {
      const created = await this.prisma.analyticsSnapshot.create({
        data: {
          userId,
          snapshotDate,
          productivityScore: scores.productivityScore,
          habitScore: scores.habitScore,
          plannerScore: scores.plannerScore,
          goalScore: scores.goalScore,
          journalScore: scores.journalScore,
          focusMinutes: scores.focusMinutes,
          streakDays: scores.streakDays,
        },
      });
      return { ...toScores(created), cached: false };
    } catch (error) {
      // A concurrent request already won the create/create race (unique (userId, snapshotDate))
      // — fall back to reading the row it just wrote rather than surfacing a 500 for what's
      // functionally a cache hit that lost a footrace.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.prisma.analyticsSnapshot.findUniqueOrThrow({
          where: { userId_snapshotDate: { userId, snapshotDate } },
        });
        return { ...toScores(winner), cached: true };
      }
      throw error;
    }
  }
}

function toScores(row: {
  snapshotDate: Date;
  productivityScore: number;
  habitScore: number;
  plannerScore: number;
  goalScore: number;
  journalScore: number;
  focusMinutes: number;
  streakDays: number;
}): TodayScores {
  return {
    snapshotDate: row.snapshotDate.toISOString().slice(0, 10),
    productivityScore: row.productivityScore,
    habitScore: row.habitScore,
    plannerScore: row.plannerScore,
    goalScore: row.goalScore,
    journalScore: row.journalScore,
    focusMinutes: row.focusMinutes,
    streakDays: row.streakDays,
  };
}
