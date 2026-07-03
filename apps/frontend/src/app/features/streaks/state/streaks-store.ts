import { Injectable, inject, signal } from '@angular/core';
import type { Achievement, FreezeDayStatus, StreaksStatistics, UseFreezeDayRequest } from '@lifeos/shared-types';
import { forkJoin, Observable, tap } from 'rxjs';
import { StreaksApiService } from '../services/streaks-api.service';

/** Owns Streak Dashboard / Achievement Gallery page state — same shape as HabitsStore/
 * RoutinesStore. Statistics and the achievement catalog are loaded together (one `forkJoin`, one
 * loading flag) since the Streak Dashboard page renders both at once and GET /streaks/statistics
 * is also what triggers achievement evaluation server-side (see StreaksService's class doc) —
 * loading achievements right after ensures the gallery reflects anything that just unlocked. */
@Injectable({ providedIn: 'root' })
export class StreaksStore {
  private readonly streaksApi = inject(StreaksApiService);

  private readonly statisticsSignal = signal<StreaksStatistics | null>(null);
  private readonly achievementsSignal = signal<Achievement[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly statistics = this.statisticsSignal.asReadonly();
  readonly achievements = this.achievementsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    forkJoin({
      statistics: this.streaksApi.statistics(),
      achievements: this.streaksApi.achievements(),
    }).subscribe({
      next: ({ statistics, achievements }) => {
        this.statisticsSignal.set(statistics);
        this.achievementsSignal.set(achievements);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load streak data. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  /** Spends a freeze day, then reloads so the freeze-quota and (if the frozen date changed
   * today's outcome) streak numbers stay in sync. */
  useFreezeDay(request: UseFreezeDayRequest = {}): Observable<FreezeDayStatus> {
    return this.streaksApi.useFreezeDay(request).pipe(tap(() => this.load()));
  }
}
