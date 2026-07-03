import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CreateGoalMilestoneRequest, Goal, GoalMilestone } from '@lifeos/shared-types';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import {
  GoalMilestoneFormDialog,
  GoalMilestoneFormDialogData,
} from '../../components/goal-milestone-form-dialog/goal-milestone-form-dialog';
import { MilestoneList } from '../../components/milestone-list/milestone-list';
import { GoalApiService } from '../../services/goal-api.service';
import { GoalsStore } from '../../state/goals-store';

/**
 * Full add/edit/delete/toggle milestone management for one goal — fetches the goal directly via
 * GoalApiService (page-local, same "single fetched entity has no other consumer" reasoning as
 * GoalDetailPage), and every milestone mutation goes through GoalsStore so the Goals Dashboard
 * list (milestonesCompletedCount/TotalCount) stays in sync the next time it's visited.
 */
@Component({
  selector: 'app-goal-milestones-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule, Skeleton, MilestoneList],
  templateUrl: './goal-milestones-page.html',
  styleUrl: './goal-milestones-page.scss',
})
export class GoalMilestonesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly goalApi = inject(GoalApiService);
  private readonly goalsStore = inject(GoalsStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly goal = signal<Goal | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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

  protected openAddDialog(): void {
    const current = this.goal();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<GoalMilestoneFormDialog, GoalMilestoneFormDialogData, CreateGoalMilestoneRequest>(
      GoalMilestoneFormDialog,
      { data: { mode: 'create' } },
    );

    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.goalsStore.addMilestone(current.id, result).subscribe({
        next: () => {
          this.snackBar.open('Milestone added', 'Dismiss', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('Could not add the milestone', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected openEditDialog(milestone: GoalMilestone): void {
    const ref = this.dialog.open<GoalMilestoneFormDialog, GoalMilestoneFormDialogData, CreateGoalMilestoneRequest>(
      GoalMilestoneFormDialog,
      {
        data: {
          mode: 'edit',
          milestone: {
            title: milestone.title,
            description: milestone.description ?? undefined,
            dueDate: milestone.dueDate ?? undefined,
            order: milestone.order,
          },
        },
      },
    );

    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.goalsStore.updateMilestone(milestone.id, result).subscribe({
        next: () => {
          this.snackBar.open('Milestone updated', 'Dismiss', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('Could not update the milestone', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected toggleMilestone(milestone: GoalMilestone): void {
    this.goalsStore.updateMilestone(milestone.id, { completed: !milestone.completed }).subscribe({
      next: () => this.load(),
      error: () => this.snackBar.open('Could not update the milestone', 'Dismiss', { duration: 3000 }),
    });
  }

  protected deleteMilestone(milestone: GoalMilestone): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete milestone',
        message: `Delete "${milestone.title}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.goalsStore.removeMilestone(milestone.id).subscribe({
        next: () => {
          this.snackBar.open('Milestone deleted', 'Dismiss', { duration: 3000 });
          this.load();
        },
        error: () => this.snackBar.open('Could not delete the milestone', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected back(): void {
    const current = this.goal();
    void this.router.navigate(current ? ['/goals', current.id] : ['/goals']);
  }
}
