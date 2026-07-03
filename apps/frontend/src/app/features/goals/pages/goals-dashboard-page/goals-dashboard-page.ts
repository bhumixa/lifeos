import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Goal } from '@lifeos/shared-types';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { GoalCard } from '../../components/goal-card/goal-card';
import { GoalFilterChange, GoalFilters } from '../../components/goal-filters/goal-filters';
import { GoalProgressWidget } from '../../components/goal-progress-widget/goal-progress-widget';
import { GoalsStore } from '../../state/goals-store';

@Component({
  selector: 'app-goals-dashboard-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    EmptyState,
    Skeleton,
    GoalCard,
    GoalFilters,
    GoalProgressWidget,
  ],
  templateUrl: './goals-dashboard-page.html',
  styleUrl: './goals-dashboard-page.scss',
})
export class GoalsDashboardPage implements OnInit {
  protected readonly store = inject(GoalsStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly skeletonRows = Array.from({ length: 4 });

  /** Top 5 active, non-archived, not-yet-complete goals — the Dashboard's "at a glance" panel,
   * reusing GoalProgressWidget's compact linear-progress row. */
  protected readonly nearestGoals = computed(() =>
    this.store
      .goals()
      .filter((goal) => !goal.archived && goal.status !== 'COMPLETED' && goal.status !== 'CANCELLED')
      .slice(0, 5),
  );

  ngOnInit(): void {
    this.store.load();
  }

  protected onFilterChange(change: GoalFilterChange): void {
    this.store.setQuery(change);
  }

  protected onPageChange(event: PageEvent): void {
    this.store.setQuery({ page: event.pageIndex + 1, pageSize: event.pageSize });
  }

  protected createGoal(): void {
    void this.router.navigate(['/goals', 'new']);
  }

  protected viewGoal(goal: Goal): void {
    void this.router.navigate(['/goals', goal.id]);
  }

  protected editGoal(goal: Goal): void {
    void this.router.navigate(['/goals', goal.id, 'edit']);
  }

  /** Archiving is non-destructive (the goal stays fully intact, just hidden from the default
   * list), but still confirmed via the shared ConfirmDialog — the "Archive Dialog" the milestone
   * brief lists as a component is this reuse, not a second bespoke dialog (same "don't duplicate
   * an existing shared component" call Milestone 6 made for its own "Habit Empty State"). */
  protected archiveGoal(goal: Goal): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Archive goal',
        message: `Archive "${goal.title}"? You can unarchive it later from its detail page.`,
        confirmLabel: 'Archive',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.archiveGoal(goal.id).subscribe({
        next: () => this.snackBar.open('Goal archived', 'Dismiss', { duration: 3000 }),
        error: () => this.snackBar.open('Could not archive the goal', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected unarchiveGoal(goal: Goal): void {
    this.store.unarchiveGoal(goal.id).subscribe({
      next: () => this.snackBar.open('Goal unarchived', 'Dismiss', { duration: 3000 }),
      error: () => this.snackBar.open('Could not unarchive the goal', 'Dismiss', { duration: 3000 }),
    });
  }

  protected deleteGoal(goal: Goal): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete goal',
        message: `Delete "${goal.title}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.deleteGoal(goal.id).subscribe({
        next: () => this.snackBar.open('Goal deleted', 'Dismiss', { duration: 3000 }),
        error: () => this.snackBar.open('Could not delete the goal', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected retry(): void {
    this.store.load();
  }
}
