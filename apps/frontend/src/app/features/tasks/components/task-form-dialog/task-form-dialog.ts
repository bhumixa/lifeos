import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import type { CreateTaskRequest, Task, TaskPriority, TaskStatus } from '@lifeos/shared-types';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../utils/task-display';
import { TasksStore } from '../../state/tasks-store';

export interface TaskFormDialogData {
  mode: 'create' | 'edit';
  task?: Task;
}

export interface TaskFormDialogResult {
  saved: boolean;
}

/** Handles both create and edit — the two forms are identical, so one dialog driven by
 * `data.mode` avoids maintaining near-duplicate components. */
@Component({
  selector: 'app-task-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './task-form-dialog.html',
  styleUrl: './task-form-dialog.scss',
})
export class TaskFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TaskFormDialog, TaskFormDialogResult>);
  private readonly tasksStore = inject(TasksStore);
  protected readonly data = inject<TaskFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly statuses = Object.entries(STATUS_LABELS) as [TaskStatus, string][];
  protected readonly priorities = Object.entries(PRIORITY_LABELS) as [TaskPriority, string][];
  protected readonly tagSeparatorKeys = [ENTER, COMMA];

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: [this.data.task?.title ?? '', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    description: [this.data.task?.description ?? '', [Validators.maxLength(5000)]],
    priority: [this.data.task?.priority ?? ('MEDIUM' as TaskPriority), [Validators.required]],
    status: [this.data.task?.status ?? ('TODO' as TaskStatus), [Validators.required]],
    dueDate: this.fb.control<Date | null>(this.data.task?.dueDate ? new Date(this.data.task.dueDate) : null),
    estimatedMinutes: this.fb.control<number | null>(this.data.task?.estimatedMinutes ?? null, [Validators.min(0), Validators.max(1440)]),
    tags: this.fb.nonNullable.control<string[]>(this.data.task?.tags ?? []),
  });

  protected addTag(event: MatChipInputEvent): void {
    const value = event.value.trim();
    if (value && !this.form.controls.tags.value.includes(value)) {
      this.form.controls.tags.setValue([...this.form.controls.tags.value, value]);
    }
    event.chipInput.clear();
  }

  protected removeTag(tag: string): void {
    this.form.controls.tags.setValue(this.form.controls.tags.value.filter((existing) => existing !== tag));
  }

  protected submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const request: CreateTaskRequest = {
      title: raw.title,
      description: raw.description || undefined,
      priority: raw.priority,
      status: raw.status,
      dueDate: raw.dueDate ? raw.dueDate.toISOString() : undefined,
      estimatedMinutes: raw.estimatedMinutes ?? undefined,
      tags: raw.tags,
    };

    const editingTaskId = this.isEdit ? this.data.task?.id : undefined;
    const save$ = editingTaskId ? this.tasksStore.updateTask(editingTaskId, request) : this.tasksStore.createTask(request);

    save$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set('Could not save the task. Please try again.');
      },
    });
  }

  protected cancel(): void {
    this.dialogRef.close({ saved: false });
  }
}
