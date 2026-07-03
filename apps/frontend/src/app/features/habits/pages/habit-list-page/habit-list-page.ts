import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Habit } from '@lifeos/shared-types';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { HabitCard } from '../../components/habit-card/habit-card';
import { HabitFilterChange, HabitFilterPanel } from '../../components/habit-filter-panel/habit-filter-panel';
import { HabitFormDialog, HabitFormDialogData, HabitFormDialogResult } from '../../components/habit-form-dialog/habit-form-dialog';
import { HabitsStore } from '../../state/habits-store';

@Component({
  selector: 'app-habit-list-page',
  imports: [MatButtonModule, MatIconModule, MatPaginatorModule, EmptyState, Skeleton, HabitCard, HabitFilterPanel],
  templateUrl: './habit-list-page.html',
  styleUrl: './habit-list-page.scss',
})
export class HabitListPage implements OnInit {
  protected readonly store = inject(HabitsStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly skeletonRows = Array.from({ length: 4 });

  ngOnInit(): void {
    this.store.load();
  }

  protected onFilterChange(change: HabitFilterChange): void {
    this.store.setQuery(change);
  }

  protected onPageChange(event: PageEvent): void {
    this.store.setQuery({ page: event.pageIndex + 1, pageSize: event.pageSize });
  }

  protected openCreateDialog(): void {
    const ref = this.dialog.open<HabitFormDialog, HabitFormDialogData, HabitFormDialogResult>(HabitFormDialog, {
      width: '520px',
      data: { mode: 'create' },
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.snackBar.open('Habit created', 'Dismiss', { duration: 3000 });
      }
    });
  }

  protected openEditDialog(habit: Habit): void {
    const ref = this.dialog.open<HabitFormDialog, HabitFormDialogData, HabitFormDialogResult>(HabitFormDialog, {
      width: '520px',
      data: { mode: 'edit', habit },
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.snackBar.open('Habit updated', 'Dismiss', { duration: 3000 });
      }
    });
  }

  protected viewHabit(habit: Habit): void {
    void this.router.navigate(['/habits', habit.id]);
  }

  protected toggleActive(habit: Habit): void {
    this.store.updateHabit(habit.id, { isActive: !habit.isActive }).subscribe({
      error: () => this.snackBar.open('Could not update the habit', 'Dismiss', { duration: 3000 }),
    });
  }

  protected deleteHabit(habit: Habit): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete habit',
        message: `Delete "${habit.name}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.deleteHabit(habit.id).subscribe({
        next: () => this.snackBar.open('Habit deleted', 'Dismiss', { duration: 3000 }),
        error: () => this.snackBar.open('Could not delete the habit', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected completeHabit(habit: Habit): void {
    this.store.quickComplete(habit).subscribe({
      error: () => this.snackBar.open('Could not log the habit', 'Dismiss', { duration: 3000 }),
    });
  }

  protected undoHabit(habit: Habit): void {
    this.store.undoToday(habit).subscribe({
      error: () => this.snackBar.open("Could not undo today's log", 'Dismiss', { duration: 3000 }),
    });
  }

  protected retry(): void {
    this.store.load();
  }
}
