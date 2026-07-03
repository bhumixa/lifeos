import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { CreateRoutineStepRequest } from '@lifeos/shared-types';

export interface RoutineStepFormDialogData {
  mode: 'create' | 'edit';
  step?: CreateRoutineStepRequest;
}

/**
 * Presentation-only — returns the entered step data via dialogRef.close() and makes no API
 * calls itself. The Routine Editor page decides what to do with the result (append to a local
 * draft in create mode, or call RoutineApiService.addStep/updateStep in edit mode) since only it
 * knows which mode the overall routine is in.
 */
@Component({
  selector: 'app-routine-step-form-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './routine-step-form-dialog.html',
  styleUrl: './routine-step-form-dialog.scss',
})
export class RoutineStepFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RoutineStepFormDialog, CreateRoutineStepRequest>);
  protected readonly data = inject<RoutineStepFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';

  protected readonly form = this.fb.nonNullable.group({
    title: [this.data.step?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    startTime: [this.data.step?.startTime ?? '07:00', [Validators.required]],
    durationMinutes: [this.data.step?.durationMinutes ?? 5, [Validators.required, Validators.min(1), Validators.max(480)]],
    reminderMinutesBefore: this.fb.control<number | null>(this.data.step?.reminderMinutesBefore ?? null, [
      Validators.min(0),
      Validators.max(1440),
    ]),
    isRequired: [this.data.step?.isRequired ?? true],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      title: raw.title,
      startTime: raw.startTime,
      durationMinutes: raw.durationMinutes,
      reminderMinutesBefore: raw.reminderMinutesBefore ?? undefined,
      isRequired: raw.isRequired,
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
