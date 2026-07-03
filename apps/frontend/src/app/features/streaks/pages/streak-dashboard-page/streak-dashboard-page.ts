import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { AchievementCard } from '../../components/achievement-card/achievement-card';
import { ConsistencyRing } from '../../components/consistency-ring/consistency-ring';
import { MonthlyHeatmap } from '../../components/monthly-heatmap/monthly-heatmap';
import { StreakCard } from '../../components/streak-card/streak-card';
import { SuccessMeter } from '../../components/success-meter/success-meter';
import { WeeklyHeatmap } from '../../components/weekly-heatmap/weekly-heatmap';
import { XpProgress } from '../../components/xp-progress/xp-progress';
import { StreaksStore } from '../../state/streaks-store';

/**
 * Streak Dashboard — the Streak Engine's own home page (distinct from the main app Dashboard's
 * *summary* of the same data, see dashboard-streaks.service.ts). Loads once via StreaksStore,
 * which also triggers achievement evaluation server-side (GET /streaks/statistics) — the recent
 * achievements shown here are always current as of this page load.
 */
@Component({
  selector: 'app-streak-dashboard-page',
  imports: [
    RouterLink,
    MatButtonModule,
    Skeleton,
    StreakCard,
    XpProgress,
    ConsistencyRing,
    SuccessMeter,
    WeeklyHeatmap,
    MonthlyHeatmap,
    AchievementCard,
  ],
  templateUrl: './streak-dashboard-page.html',
  styleUrl: './streak-dashboard-page.scss',
})
export class StreakDashboardPage implements OnInit {
  private readonly store = inject(StreaksStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly statistics = this.store.statistics;
  protected readonly achievements = this.store.achievements;
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;

  protected readonly recentUnlocked = computed(() =>
    this.achievements()
      .filter((achievement) => achievement.unlocked)
      .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
      .slice(0, 3),
  );

  ngOnInit(): void {
    this.store.load();
  }

  protected retry(): void {
    this.store.load();
  }

  protected useFreezeDay(): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Use a freeze day',
        message: "Protect today's streak with one of your remaining freeze days for this month?",
        confirmLabel: 'Use freeze day',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.useFreezeDay().subscribe({
        next: () => this.snackBar.open('Freeze day used', 'Dismiss', { duration: 3000 }),
        error: (err: unknown) => this.snackBar.open(this.freezeDayErrorMessage(err), 'Dismiss', { duration: 3000 }),
      });
    });
  }

  /** Surfaces the backend's own message (e.g. "No freeze days remaining...", "already been
   * frozen") when present, since those are more useful than a generic fallback here. */
  private freezeDayErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return 'Could not use a freeze day';
  }
}
