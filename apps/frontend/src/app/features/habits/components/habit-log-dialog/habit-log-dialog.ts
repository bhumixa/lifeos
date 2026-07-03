import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { CreateHabitLogRequest, HabitLog } from '@lifeos/shared-types';
import { toLocalDateString } from '../../utils/habit-display';

export interface HabitLogDialogData {
  /** Existing log to edit, if the user is revising a specific day's entry. */
  log?: HabitLog;
  /** Default date when logging fresh — defaults to today when both this and `log` are omitted. */
  date?: string;
}

/**
 * Presentation-only, same shape as RoutineStepFormDialog — collects the log's fields and returns
 * them via dialogRef.close(); the caller decides whether that means POST (new log) or PATCH
 * (existing log), since only the caller knows which one already exists (see HabitDetailPage /
 * HabitHistoryPage).
 */
@Component({
  selector: 'app-habit-log-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './habit-log-dialog.html',
  styleUrl: './habit-log-dialog.scss',
})
export class HabitLogDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<HabitLogDialog, CreateHabitLogRequest>);
  protected readonly data = inject<HabitLogDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data.log;
  private readonly defaultDate = this.data.log?.date ?? this.data.date ?? new Date().toISOString().slice(0, 10);

  protected readonly form = this.fb.nonNullable.group({
    date: this.fb.nonNullable.control<Date>(new Date(this.defaultDate)),
    completedCount: [
      this.data.log?.completedCount ?? 1,
      [Validators.required, Validators.min(0), Validators.max(1000)],
    ],
    notes: [this.data.log?.notes ?? '', [Validators.maxLength(1000)]],
  });

  constructor() {
    // A log's date is its identity — editing one always targets the day it was created for, so
    // the field is shown but locked rather than letting an edit silently retarget another date.
    if (this.isEdit) {
      this.form.controls.date.disable();
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      date: toLocalDateString(raw.date),
      completedCount: raw.completedCount,
      notes: raw.notes || undefined,
    });
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }
}
