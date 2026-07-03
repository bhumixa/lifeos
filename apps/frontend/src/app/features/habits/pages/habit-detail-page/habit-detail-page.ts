import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CreateHabitLogRequest, Habit, HabitLog } from '@lifeos/shared-types';
import { forkJoin } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { HabitCalendarHeatmap } from '../../components/habit-calendar-heatmap/habit-calendar-heatmap';
import { HabitCompletionButton } from '../../components/habit-completion-button/habit-completion-button';
import { HabitFormDialog, HabitFormDialogData, HabitFormDialogResult } from '../../components/habit-form-dialog/habit-form-dialog';
import { HabitLogDialog, HabitLogDialogData } from '../../components/habit-log-dialog/habit-log-dialog';
import { HabitStatisticsCard } from '../../components/habit-statistics-card/habit-statistics-card';
import { HabitApiService } from '../../services/habit-api.service';
import { HabitsStore } from '../../state/habits-store';
import { buildHeatmapCells, toLocalDateString } from '../../utils/habit-display';

const HEATMAP_RANGE_DAYS = 84; // 12 weeks

/**
 * Fetches its one habit (and its recent history, for the heatmap/stats) directly via
 * HabitApiService rather than through HabitsStore — page-local data with no other consumer,
 * same reasoning as TaskDetailPage.
 */
@Component({
  selector: 'app-habit-detail-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    Skeleton,
    HabitCalendarHeatmap,
    HabitCompletionButton,
    HabitStatisticsCard,
  ],
  templateUrl: './habit-detail-page.html',
  styleUrl: './habit-detail-page.scss',
})
export class HabitDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly habitApi = inject(HabitApiService);
  private readonly habitsStore = inject(HabitsStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly historyWindowDays = HEATMAP_RANGE_DAYS;

  protected readonly habit = signal<Habit | null>(null);
  protected readonly logs = signal<HabitLog[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly heatmapCells = computed(() => {
    const current = this.habit();
    return current ? buildHeatmapCells(this.logs(), current.targetCount, HEATMAP_RANGE_DAYS) : [];
  });
  protected readonly loggedDays = computed(() => this.logs().filter((log) => log.completedCount > 0).length);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Habit not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const historyStart = new Date();
    historyStart.setDate(historyStart.getDate() - (HEATMAP_RANGE_DAYS - 1));

    forkJoin({
      habit: this.habitApi.getById(id),
      history: this.habitApi.history({
        habitId: id,
        dateFrom: toLocalDateString(historyStart),
        pageSize: HEATMAP_RANGE_DAYS,
      }),
    }).subscribe({
      next: ({ habit, history }) => {
        this.habit.set(habit);
        this.logs.set(history.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this habit. It may not exist, or you may not have access to it.');
        this.loading.set(false);
      },
    });
  }

  protected edit(): void {
    const current = this.habit();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<HabitFormDialog, HabitFormDialogData, HabitFormDialogResult>(HabitFormDialog, {
      width: '520px',
      data: { mode: 'edit', habit: current },
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.snackBar.open('Habit updated', 'Dismiss', { duration: 3000 });
        this.load();
      }
    });
  }

  protected delete(): void {
    const current = this.habit();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete habit',
        message: `Delete "${current.name}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.habitsStore.deleteHabit(current.id).subscribe({
        next: () => {
          this.snackBar.open('Habit deleted', 'Dismiss', { duration: 3000 });
          void this.router.navigate(['/habits']);
        },
        error: () => this.snackBar.open('Could not delete the habit', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected quickComplete(): void {
    const current = this.habit();
    if (!current) {
      return;
    }
    this.habitsStore.quickComplete(current).subscribe({
      next: () => this.load(),
      error: () => this.snackBar.open('Could not log the habit', 'Dismiss', { duration: 3000 }),
    });
  }

  protected undoToday(): void {
    const current = this.habit();
    if (!current) {
      return;
    }
    this.habitsStore.undoToday(current).subscribe({
      next: () => this.load(),
      error: () => this.snackBar.open("Could not undo today's log", 'Dismiss', { duration: 3000 }),
    });
  }

  protected openLogDialog(): void {
    const current = this.habit();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<HabitLogDialog, HabitLogDialogData, CreateHabitLogRequest>(HabitLogDialog, {
      data: {},
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.habitApi.createLog(current.id, result).subscribe({
        next: () => {
          this.snackBar.open('Log added', 'Dismiss', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('Could not add the log — one may already exist for that date', 'Dismiss', { duration: 4000 }),
      });
    });
  }

  protected back(): void {
    void this.router.navigate(['/habits']);
  }
}
