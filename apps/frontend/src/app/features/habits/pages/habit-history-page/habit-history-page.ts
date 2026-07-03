import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CreateHabitLogRequest, Habit, HabitLog, PaginationMeta } from '@lifeos/shared-types';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { HabitCalendarHeatmap } from '../../components/habit-calendar-heatmap/habit-calendar-heatmap';
import { HabitLogDialog, HabitLogDialogData } from '../../components/habit-log-dialog/habit-log-dialog';
import { HabitApiService } from '../../services/habit-api.service';
import { buildHeatmapCells, toLocalDateString } from '../../utils/habit-display';

const HEATMAP_RANGE_DAYS = 84;
const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 10, total: 0, totalPages: 1 };

/** Habit selector + calendar heatmap + a paginated log table for that habit — page-local state,
 * since this is a browsing view with no shared consumer (same reasoning as the other habit
 * detail-style pages). */
@Component({
  selector: 'app-habit-history-page',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
    EmptyState,
    Skeleton,
    HabitCalendarHeatmap,
  ],
  templateUrl: './habit-history-page.html',
  styleUrl: './habit-history-page.scss',
})
export class HabitHistoryPage implements OnInit {
  private readonly habitApi = inject(HabitApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly habits = signal<Habit[]>([]);
  protected readonly selectedHabitId = signal<string | null>(null);
  protected readonly selectedHabit = computed(() => this.habits().find((habit) => habit.id === this.selectedHabitId()) ?? null);

  protected readonly logs = signal<HabitLog[]>([]);
  protected readonly heatmapLogs = signal<HabitLog[]>([]);
  protected readonly meta = signal<PaginationMeta>(DEFAULT_META);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly isEmpty = computed(() => !this.loading() && !this.error() && this.logs().length === 0);

  protected readonly heatmapCells = computed(() => {
    const habit = this.selectedHabit();
    return habit ? buildHeatmapCells(this.heatmapLogs(), habit.targetCount, HEATMAP_RANGE_DAYS) : [];
  });

  ngOnInit(): void {
    this.habitApi.list({ pageSize: 100, sortBy: 'name', sortOrder: 'asc' }).subscribe({
      next: (result) => {
        this.habits.set(result.data);
        const firstHabitId = result.data[0]?.id ?? null;
        this.selectedHabitId.set(firstHabitId);
        if (firstHabitId) {
          this.loadHistory(firstHabitId, 1);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('Could not load your habits. Please try again.');
        this.loading.set(false);
      },
    });
  }

  protected onHabitChange(habitId: string): void {
    this.selectedHabitId.set(habitId);
    this.loadHistory(habitId, 1);
  }

  protected onPageChange(event: PageEvent): void {
    const habitId = this.selectedHabitId();
    if (habitId) {
      this.loadHistory(habitId, event.pageIndex + 1, event.pageSize);
    }
  }

  protected editLog(log: HabitLog): void {
    const habitId = this.selectedHabitId();
    if (!habitId) {
      return;
    }

    const ref = this.dialog.open<HabitLogDialog, HabitLogDialogData, CreateHabitLogRequest>(HabitLogDialog, {
      data: { log },
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.habitApi.updateLog(habitId, result).subscribe({
        next: () => {
          this.snackBar.open('Log updated', 'Dismiss', { duration: 3000 });
          this.loadHistory(habitId, this.meta().page);
        },
        error: () => this.snackBar.open('Could not update the log', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected deleteLog(log: HabitLog): void {
    const habitId = this.selectedHabitId();
    if (!habitId) {
      return;
    }

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete log',
        message: `Delete the log for ${log.date}? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.habitApi.removeLog(habitId, log.date).subscribe({
        next: () => {
          this.snackBar.open('Log deleted', 'Dismiss', { duration: 3000 });
          this.loadHistory(habitId, this.meta().page);
        },
        error: () => this.snackBar.open('Could not delete the log', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected retry(): void {
    const habitId = this.selectedHabitId();
    if (habitId) {
      this.loadHistory(habitId, this.meta().page);
    }
  }

  private loadHistory(habitId: string, page: number, pageSize = this.meta().pageSize): void {
    this.loading.set(true);
    this.error.set(null);

    const heatmapStart = new Date();
    heatmapStart.setDate(heatmapStart.getDate() - (HEATMAP_RANGE_DAYS - 1));

    this.habitApi.history({ habitId, page, pageSize }).subscribe({
      next: (result) => {
        this.logs.set(result.data);
        this.meta.set(result.meta);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this habit’s history. Please try again.');
        this.loading.set(false);
      },
    });

    // Separate, unpaginated fetch bounded to the heatmap's fixed window — independent of
    // whatever page the log table is currently showing.
    this.habitApi
      .history({ habitId, dateFrom: toLocalDateString(heatmapStart), pageSize: HEATMAP_RANGE_DAYS })
      .subscribe({ next: (result) => this.heatmapLogs.set(result.data) });
  }
}
