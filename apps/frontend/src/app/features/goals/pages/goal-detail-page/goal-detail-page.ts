import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Goal, GoalMilestone } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { GoalStatistics } from '../../components/goal-statistics/goal-statistics';
import { GoalTimeline } from '../../components/goal-timeline/goal-timeline';
import { MilestoneList } from '../../components/milestone-list/milestone-list';
import { GoalApiService } from '../../services/goal-api.service';
import { GoalsStore } from '../../state/goals-store';
import { PRIORITY_LABELS, PRIORITY_VARIANTS, STATUS_LABELS, STATUS_VARIANTS, deadlineIndicator } from '../../utils/goal-display';

/**
 * Fetches its one goal directly via GoalApiService rather than through GoalsStore — page-local
 * data with no other consumer, same reasoning as HabitDetailPage/TaskDetailPage. Milestone
 * toggling here goes through GoalsStore (so the Dashboard list refreshes too), but this page's own
 * `goal` signal is what actually re-renders — see toggleMilestone.
 */
@Component({
  selector: 'app-goal-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    Skeleton,
    Badge,
    GoalStatistics,
    GoalTimeline,
    MilestoneList,
  ],
  templateUrl: './goal-detail-page.html',
  styleUrl: './goal-detail-page.scss',
})
export class GoalDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly goalApi = inject(GoalApiService);
  private readonly goalsStore = inject(GoalsStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly goal = signal<Goal | null>(null);
  protected readonly loading = signal(true);
  protected readonly refreshingProgress = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly priorityLabel = computed(() => {
    const current = this.goal();
    return current ? PRIORITY_LABELS[current.priority] : '';
  });
  protected readonly priorityVariant = computed(() => {
    const current = this.goal();
    return current ? PRIORITY_VARIANTS[current.priority] : 'neutral';
  });
  protected readonly statusLabel = computed(() => {
    const current = this.goal();
    return current ? STATUS_LABELS[current.status] : '';
  });
  protected readonly statusVariant = computed(() => {
    const current = this.goal();
    return current ? STATUS_VARIANTS[current.status] : 'neutral';
  });
  protected readonly deadline = computed(() => {
    const current = this.goal();
    return current ? deadlineIndicator(current) : null;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Goal not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.goalApi.getById(id).subscribe({
      next: (goal) => {
        this.goal.set(goal);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this goal. It may not exist, or you may not have access to it.');
        this.loading.set(false);
      },
    });
  }

  /** Explicitly recomputes progress from source Task/Habit/Routine/Planner data (GET
   * /goals/:id/progress) rather than relying on GET /goals/:id's cheaper, stored-value read — see
   * GoalsService's class doc for why those two reads are deliberately different. */
  protected refreshProgress(): void {
    const current = this.goal();
    if (!current) {
      return;
    }
    this.refreshingProgress.set(true);
    this.goalApi.progress(current.id).subscribe({
      next: () => {
        this.refreshingProgress.set(false);
        this.load();
      },
      error: () => {
        this.refreshingProgress.set(false);
        this.snackBar.open('Could not refresh progress', 'Dismiss', { duration: 3000 });
      },
    });
  }

  protected edit(): void {
    const current = this.goal();
    if (current) {
      void this.router.navigate(['/goals', current.id, 'edit']);
    }
  }

  protected manageMilestones(): void {
    const current = this.goal();
    if (current) {
      void this.router.navigate(['/goals', current.id, 'milestones']);
    }
  }

  /** Archiving is non-destructive, but still confirmed via the shared ConfirmDialog — see the
   * comment on GoalsDashboardPage.archiveGoal for why that's this milestone's "Archive Dialog",
   * not a second bespoke component. */
  protected archive(): void {
    const current = this.goal();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Archive goal',
        message: `Archive "${current.title}"? You can unarchive it later from this page.`,
        confirmLabel: 'Archive',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.goalsStore.archiveGoal(current.id).subscribe({
        next: () => {
          this.snackBar.open('Goal archived', 'Dismiss', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('Could not archive the goal', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected unarchive(): void {
    const current = this.goal();
    if (!current) {
      return;
    }
    this.goalsStore.unarchiveGoal(current.id).subscribe({
      next: () => {
        this.snackBar.open('Goal unarchived', 'Dismiss', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('Could not unarchive the goal', 'Dismiss', { duration: 3000 }),
    });
  }

  protected delete(): void {
    const current = this.goal();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete goal',
        message: `Delete "${current.title}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.goalsStore.deleteGoal(current.id).subscribe({
        next: () => {
          this.snackBar.open('Goal deleted', 'Dismiss', { duration: 3000 });
          void this.router.navigate(['/goals']);
        },
        error: () => this.snackBar.open('Could not delete the goal', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected toggleMilestone(milestone: GoalMilestone): void {
    this.goalsStore.updateMilestone(milestone.id, { completed: !milestone.completed }).subscribe({
      next: () => this.load(),
      error: () => this.snackBar.open('Could not update the milestone', 'Dismiss', { duration: 3000 }),
    });
  }

  protected back(): void {
    void this.router.navigate(['/goals']);
  }
}
