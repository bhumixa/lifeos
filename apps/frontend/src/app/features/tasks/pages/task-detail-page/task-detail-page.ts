import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Task } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { TaskFormDialog, TaskFormDialogData, TaskFormDialogResult } from '../../components/task-form-dialog/task-form-dialog';
import { TaskApiService } from '../../services/task-api.service';
import { TasksStore } from '../../state/tasks-store';
import {
  PRIORITY_LABELS,
  PRIORITY_VARIANTS,
  STATUS_LABELS,
  STATUS_VARIANTS,
  dueDateIndicator,
} from '../../utils/task-display';

/**
 * Fetches its one task via TaskApiService directly rather than through TasksStore — this is
 * page-local state with no other consumer (see TasksStore's class doc for why the list page's
 * store is the wrong home for it). Mutations (edit/delete/complete) still go through TasksStore
 * so the list page's cache is invalidated if the user navigates back to it.
 */
@Component({
  selector: 'app-task-detail-page',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule, Skeleton, Badge],
  templateUrl: './task-detail-page.html',
  styleUrl: './task-detail-page.scss',
})
export class TaskDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly taskApi = inject(TaskApiService);
  private readonly tasksStore = inject(TasksStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly task = signal<Task | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly dueIndicator = computed(() => {
    const current = this.task();
    return current ? dueDateIndicator(current) : null;
  });

  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly priorityVariants = PRIORITY_VARIANTS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusVariants = STATUS_VARIANTS;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Task not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.taskApi.getById(id).subscribe({
      next: (task) => {
        this.task.set(task);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this task. It may not exist, or you may not have access to it.');
        this.loading.set(false);
      },
    });
  }

  protected edit(): void {
    const current = this.task();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<TaskFormDialog, TaskFormDialogData, TaskFormDialogResult>(TaskFormDialog, {
      width: '520px',
      data: { mode: 'edit', task: current },
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.snackBar.open('Task updated', 'Dismiss', { duration: 3000 });
        this.load();
      }
    });
  }

  protected delete(): void {
    const current = this.task();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete task',
        message: `Delete "${current.title}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.tasksStore.deleteTask(current.id).subscribe({
        next: () => {
          this.snackBar.open('Task deleted', 'Dismiss', { duration: 3000 });
          void this.router.navigate(['/tasks']);
        },
        error: () => this.snackBar.open('Could not delete task', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected complete(): void {
    const current = this.task();
    if (!current) {
      return;
    }

    this.tasksStore.completeTask(current.id).subscribe({
      next: (updated) => this.task.set(updated),
      error: () => this.snackBar.open('Could not complete task', 'Dismiss', { duration: 3000 }),
    });
  }

  protected back(): void {
    void this.router.navigate(['/tasks']);
  }
}
