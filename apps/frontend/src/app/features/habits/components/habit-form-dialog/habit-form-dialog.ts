import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { CreateHabitRequest, Habit, HabitFrequency } from '@lifeos/shared-types';
import { FREQUENCY_LABELS } from '../../utils/habit-display';
import { HabitsStore } from '../../state/habits-store';

export interface HabitFormDialogData {
  mode: 'create' | 'edit';
  habit?: Habit;
}

export interface HabitFormDialogResult {
  saved: boolean;
}

const ICON_OPTIONS = ['local_drink', 'fitness_center', 'menu_book', 'self_improvement', 'bedtime', 'directions_run', 'spa'];
const COLOR_OPTIONS = ['#03A9F4', '#4CAF50', '#FF9800', '#9C27B0', '#E91E63', '#009688', '#795548'];

/** Handles both create and edit — same "one dialog driven by data.mode" shape as
 * TaskFormDialog, since the two forms are otherwise identical. */
@Component({
  selector: 'app-habit-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './habit-form-dialog.html',
  styleUrl: './habit-form-dialog.scss',
})
export class HabitFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<HabitFormDialog, HabitFormDialogResult>);
  private readonly habitsStore = inject(HabitsStore);
  protected readonly data = inject<HabitFormDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly frequencies = Object.entries(FREQUENCY_LABELS) as [HabitFrequency, string][];
  protected readonly iconOptions = ICON_OPTIONS;
  protected readonly colorOptions = COLOR_OPTIONS;

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: [this.data.habit?.name ?? '', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    description: [this.data.habit?.description ?? '', [Validators.maxLength(2000)]],
    icon: [this.data.habit?.icon ?? ICON_OPTIONS[0], [Validators.required]],
    color: [this.data.habit?.color ?? COLOR_OPTIONS[0], [Validators.required]],
    targetFrequency: [this.data.habit?.targetFrequency ?? ('DAILY' as HabitFrequency), [Validators.required]],
    targetCount: [this.data.habit?.targetCount ?? 1, [Validators.required, Validators.min(1), Validators.max(1000)]],
    category: [this.data.habit?.category ?? '', [Validators.maxLength(50)]],
    reminderTime: this.fb.control<string | null>(this.data.habit?.reminderTime ?? null),
    isActive: [this.data.habit?.isActive ?? true],
  });

  protected submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const request: CreateHabitRequest = {
      name: raw.name,
      description: raw.description || undefined,
      icon: raw.icon,
      color: raw.color,
      targetFrequency: raw.targetFrequency,
      targetCount: raw.targetCount,
      category: raw.category || undefined,
      reminderTime: raw.reminderTime || undefined,
      isActive: raw.isActive,
    };

    const editingHabitId = this.isEdit ? this.data.habit?.id : undefined;
    const save$ = editingHabitId
      ? this.habitsStore.updateHabit(editingHabitId, request)
      : this.habitsStore.createHabit(request);

    save$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.dialogRef.close({ saved: true });
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const isConflict = err instanceof Object && 'status' in err && (err as { status: number }).status === 409;
        this.errorMessage.set(
          isConflict ? 'A habit with this name already exists.' : 'Could not save the habit. Please try again.',
        );
      },
    });
  }

  protected cancel(): void {
    this.dialogRef.close({ saved: false });
  }
}
