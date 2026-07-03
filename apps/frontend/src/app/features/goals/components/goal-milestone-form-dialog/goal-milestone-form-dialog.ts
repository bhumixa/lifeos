import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { CreateGoalMilestoneRequest } from '@lifeos/shared-types';

export interface GoalMilestoneFormDialogData {
  mode: 'create' | 'edit';
  milestone?: CreateGoalMilestoneRequest;
}

/**
 * Presentation-only, same shape as RoutineStepFormDialog — returns the entered milestone data via
 * dialogRef.close() and makes no API calls itself. The hosting page (Goal Detail or Goal
 * Milestones) decides whether that means GoalsStore.addMilestone or .updateMilestone.
 */
@Component({
  selector: 'app-goal-milestone-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  templateUrl: './goal-milestone-form-dialog.html',
  styleUrl: './goal-milestone-form-dialog.scss',
})
export class GoalMilestoneFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<GoalMilestoneFormDialog, CreateGoalMilestoneRequest>);
  protected readonly data = inject<GoalMilestoneFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';

  protected readonly form = this.fb.nonNullable.group({
    title: [this.data.milestone?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    description: [this.data.milestone?.description ?? ''],
    dueDate: this.fb.control<Date | null>(
      this.data.milestone?.dueDate ? new Date(this.data.milestone.dueDate) : null,
    ),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      title: raw.title,
      description: raw.description || undefined,
      dueDate: raw.dueDate ? this.toDateOnly(raw.dueDate) : undefined,
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private toDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
