import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { CreatePlannerBlockRequest, Habit, PlannerBlock, PlannerBlockType, Task } from '@lifeos/shared-types';
import { forkJoin } from 'rxjs';
import { HabitApiService } from '../../../habits/services/habit-api.service';
import { TaskApiService } from '../../../tasks/services/task-api.service';
import { TYPE_LABELS } from '../../utils/planner-display';

export interface BlockDialogData {
  mode: 'create' | 'edit';
  /** "YYYY-MM-DD" — the day this block belongs to; combined with the form's HH:mm fields to
   * build full ISO datetimes, since a dialog only ever edits one day's block. */
  date: string;
  block?: PlannerBlock;
}

const TYPE_OPTIONS: PlannerBlockType[] = ['TASK', 'ROUTINE', 'HABIT', 'FOCUS', 'BREAK', 'CUSTOM'];
const COLOR_OPTIONS = ['#3F51B5', '#009688', '#4CAF50', '#FF9800', '#9E9E9E', '#607D8B', '#E91E63'];

/**
 * Create/edit form for a single PlannerBlock. When `type` is TASK or HABIT, offers a picker over
 * the user's own open tasks/not-yet-completed-today habits (reusing TaskApiService/
 * HabitApiService directly — the same cross-feature reuse the dashboard's own summary services
 * already do) so "Tasks can be scheduled" / "Habits can become planner blocks" is a real picker,
 * not just free-text matching an id the user would have to know.
 */
@Component({
  selector: 'app-block-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './block-dialog.html',
  styleUrl: './block-dialog.scss',
})
export class BlockDialog implements OnInit {
  protected readonly data = inject<BlockDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BlockDialog, CreatePlannerBlockRequest>);
  private readonly fb = inject(FormBuilder);
  private readonly taskApi = inject(TaskApiService);
  private readonly habitApi = inject(HabitApiService);

  protected readonly isEditMode = this.data.mode === 'edit';
  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly colorOptions = COLOR_OPTIONS;

  protected readonly openTasks = signal<Task[]>([]);
  protected readonly openHabits = signal<Habit[]>([]);
  protected readonly loadingPickers = signal(false);
  protected readonly selectedType = signal<PlannerBlockType>(this.data.block?.type ?? 'CUSTOM');

  protected readonly form = this.fb.nonNullable.group({
    type: [this.data.block?.type ?? ('CUSTOM' as PlannerBlockType), [Validators.required]],
    referenceId: [this.data.block?.referenceId ?? (undefined as string | undefined)],
    title: [this.data.block?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    description: [this.data.block?.description ?? ''],
    startTime: [this.data.block ? toTimeInput(this.data.block.startTime) : '', [Validators.required]],
    endTime: [this.data.block ? toTimeInput(this.data.block.endTime) : '', [Validators.required]],
    color: [this.data.block?.color ?? COLOR_OPTIONS[0]],
  });

  ngOnInit(): void {
    // Only TASK/HABIT need the pickers, but both lists are cheap and small — fetching both up
    // front lets the user switch `type` back and forth without re-fetching.
    this.loadingPickers.set(true);
    forkJoin({
      tasks: this.taskApi.list({ pageSize: 100 }),
      habits: this.habitApi.today(),
    }).subscribe({
      next: ({ tasks, habits }) => {
        this.openTasks.set(tasks.data.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS'));
        this.openHabits.set(habits.filter((habit) => !habit.completedToday));
        this.loadingPickers.set(false);
      },
      error: () => this.loadingPickers.set(false),
    });
  }

  protected onTypeChange(type: PlannerBlockType): void {
    this.selectedType.set(type);
    // A referenceId picked under one type doesn't carry meaning under another.
    this.form.patchValue({ referenceId: undefined });
  }

  protected onTaskSelected(taskId: string): void {
    const task = this.openTasks().find((candidate) => candidate.id === taskId);
    if (!task) {
      return;
    }
    this.form.patchValue({ referenceId: task.id, title: task.title });
  }

  protected onHabitSelected(habitId: string): void {
    const habit = this.openHabits().find((candidate) => candidate.id === habitId);
    if (!habit) {
      return;
    }
    this.form.patchValue({ referenceId: habit.id, title: habit.name });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const startTime = toIsoDateTime(this.data.date, raw.startTime);
    const endTime = toIsoDateTime(this.data.date, raw.endTime);
    if (new Date(endTime) <= new Date(startTime)) {
      this.form.controls.endTime.setErrors({ range: true });
      return;
    }

    this.dialogRef.close({
      type: raw.type,
      referenceId: raw.referenceId || undefined,
      title: raw.title,
      description: raw.description || undefined,
      startTime,
      endTime,
      color: raw.color,
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}

/** ISO datetime -> "HH:mm" in local time, for pre-filling the form's native time inputs. */
function toTimeInput(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" + "HH:mm" (both local) -> ISO datetime, built from local components rather than
 * string-concatenating and parsing, so it's unambiguous regardless of the browser's timezone. */
function toIsoDateTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}
