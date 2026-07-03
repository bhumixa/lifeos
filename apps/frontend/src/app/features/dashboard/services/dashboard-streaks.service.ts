import { Injectable, inject } from '@angular/core';
import { forkJoin, map, type Observable } from 'rxjs';
import { StreaksApiService } from '../../streaks/services/streaks-api.service';

export interface DashboardStreaksSummary {
  currentStreak: number;
  longestStreak: number;
  xpEarned: number;
  achievementsUnlockedCount: number;
  weeklyConsistency: number;
  monthlyConsistency: number;
  successRate: number;
}

/** Combines GET /streaks/statistics (which already carries current/longest streak, XP, and all
 * three consistency percentages) with GET /achievements/unlocked (for a plain count) into the
 * flat shape the Dashboard's stat cards need — the same "one endpoint, several derived widgets"
 * shape DashboardHabitStatsService established for GET /habits/summary, extended to two calls
 * here since achievement counts live on a separate endpoint. Visiting the Dashboard also means
 * GET /streaks/statistics runs, which is what triggers achievement evaluation server-side (see
 * StreaksService's class doc) — so a newly-earned achievement is reflected the very next time
 * this loads. */
@Injectable({ providedIn: 'root' })
export class DashboardStreaksService {
  private readonly streaksApi = inject(StreaksApiService);

  load(): Observable<DashboardStreaksSummary> {
    return forkJoin({
      statistics: this.streaksApi.statistics(),
      unlocked: this.streaksApi.unlockedAchievements(),
    }).pipe(
      map(({ statistics, unlocked }) => ({
        currentStreak: statistics.currentStreak,
        longestStreak: statistics.longestStreak,
        xpEarned: statistics.xpEarned,
        achievementsUnlockedCount: unlocked.length,
        weeklyConsistency: statistics.weeklyConsistency,
        monthlyConsistency: statistics.monthlyConsistency,
        successRate: statistics.successRate,
      })),
    );
  }
}
