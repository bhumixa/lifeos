import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Task } from '@lifeos/shared-types';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { TaskCard } from '../../components/task-card/task-card';
import { TaskFormDialog, TaskFormDialogData, TaskFormDialogResult } from '../../components/task-form-dialog/task-form-dialog';
import { TaskFilterChange, TaskToolbar } from '../../components/task-toolbar/task-toolbar';
import { TasksStore } from '../../state/tasks-store';

@Component({
  selector: 'app-task-list-page',
  imports: [MatButtonModule, MatIconModule, MatPaginatorModule, EmptyState, Skeleton, TaskCard, TaskToolbar],
  templateUrl: './task-list-page.html',
  styleUrl: './task-list-page.scss',
})
export class TaskListPage implements OnInit {
  protected readonly store = inject(TasksStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly skeletonRows = Array.from({ length: 5 });

  ngOnInit(): void {
    this.store.load();
  }

  protected onFilterChange(change: TaskFilterChange): void {
    this.store.setQuery(change);
  }

  protected onPageChange(event: PageEvent): void {
    this.store.setQuery({ page: event.pageIndex + 1, pageSize: event.pageSize });
  }

  protected openCreateDialog(): void {
    const ref = this.dialog.open<TaskFormDialog, TaskFormDialogData, TaskFormDialogResult>(TaskFormDialog, {
      width: '520px',
      data: { mode: 'create' },
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.snackBar.open('Task created', 'Dismiss', { duration: 3000 });
      }
    });
  }

  protected openEditDialog(task: Task): void {
    const ref = this.dialog.open<TaskFormDialog, TaskFormDialogData, TaskFormDialogResult>(TaskFormDialog, {
      width: '520px',
      data: { mode: 'edit', task },
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.saved) {
        this.snackBar.open('Task updated', 'Dismiss', { duration: 3000 });
      }
    });
  }

  protected viewTask(task: Task): void {
    void this.router.navigate(['/tasks', task.id]);
  }

  protected deleteTask(task: Task): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete task',
        message: `Delete "${task.title}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.deleteTask(task.id).subscribe({
        next: () => this.snackBar.open('Task deleted', 'Dismiss', { duration: 3000 }),
        error: () => this.snackBar.open('Could not delete task', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected toggleComplete(task: Task): void {
    this.store.completeTask(task.id).subscribe({
      error: () => this.snackBar.open('Could not complete task', 'Dismiss', { duration: 3000 }),
    });
  }

  protected retry(): void {
    this.store.load();
  }
}
