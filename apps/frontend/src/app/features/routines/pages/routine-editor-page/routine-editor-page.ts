import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CreateRoutineStepRequest, RoutineStep } from '@lifeos/shared-types';
import {
  RoutineStepFormDialog,
  RoutineStepFormDialogData,
} from '../../components/routine-step-form-dialog/routine-step-form-dialog';
import { RoutineApiService } from '../../services/routine-api.service';
import { formatDuration, formatTimeOfDay } from '../../utils/routine-display';

interface DraftStep extends CreateRoutineStepRequest {
  /** Real RoutineStep id in edit mode (each mutation is persisted immediately); a locally
   * generated placeholder in create mode (nothing exists server-side until the final submit). */
  id: string;
}

const ICON_OPTIONS = ['wb_sunny', 'nights_stay', 'fitness_center', 'self_improvement', 'work', 'restaurant', 'school'];
const COLOR_OPTIONS = ['#FF9800', '#3F51B5', '#4CAF50', '#E91E63', '#009688', '#795548', '#607D8B'];

/**
 * Handles both create and edit, but — unlike TaskFormDialog — the two modes behave differently
 * under the hood, because the backend has no "replace all steps" bulk endpoint:
 *  - Create mode: routine + steps are built up entirely client-side and submitted once via
 *    POST /routines (which accepts nested steps) when the user saves.
 *  - Edit mode: the routine already exists, so every step add/edit/delete/reorder is persisted
 *    immediately via its own endpoint, and "Save" only covers the routine-level fields
 *    (name/icon/color/description).
 */
@Component({
  selector: 'app-routine-editor-page',
  imports: [
    DragDropModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './routine-editor-page.html',
  styleUrl: './routine-editor-page.scss',
})
export class RoutineEditorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routineApi = inject(RoutineApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  private readonly routeId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = this.routeId !== null && this.routeId !== 'new';
  private readonly routineId = this.isEditMode ? this.routeId : null;

  protected readonly iconOptions = ICON_OPTIONS;
  protected readonly colorOptions = COLOR_OPTIONS;

  protected readonly loading = signal(this.isEditMode);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly steps = signal<DraftStep[]>([]);
  protected readonly totalDurationLabel = computed(() =>
    formatDuration(this.steps().reduce((total, step) => total + step.durationMinutes, 0)),
  );

  protected readonly formatTimeOfDay = formatTimeOfDay;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    icon: [ICON_OPTIONS[0], [Validators.required]],
    color: [COLOR_OPTIONS[0], [Validators.required]],
    description: [''],
  });

  ngOnInit(): void {
    if (this.routineId) {
      this.loadRoutine(this.routineId);
    }
  }

  private loadRoutine(id: string): void {
    this.routineApi.getById(id).subscribe({
      next: (routine) => {
        this.form.patchValue({
          name: routine.name,
          icon: routine.icon,
          color: routine.color,
          description: routine.description ?? '',
        });
        this.steps.set(
          routine.steps.map((step) => ({
            id: step.id,
            title: step.title,
            startTime: step.startTime,
            durationMinutes: step.durationMinutes,
            reminderMinutesBefore: step.reminderMinutesBefore ?? undefined,
            isRequired: step.isRequired,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this routine.');
        this.loading.set(false);
      },
    });
  }

  protected onStepDrop(event: CdkDragDrop<DraftStep[]>): void {
    const reordered = [...this.steps()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.steps.set(reordered);

    if (this.isEditMode && this.routineId) {
      this.routineApi.reorderSteps(this.routineId, { stepIds: reordered.map((step) => step.id) }).subscribe({
        error: () => this.snackBar.open('Could not save the new step order', 'Dismiss', { duration: 3000 }),
      });
    }
  }

  protected openAddStepDialog(): void {
    const ref = this.dialog.open<RoutineStepFormDialog, RoutineStepFormDialogData, CreateRoutineStepRequest>(
      RoutineStepFormDialog,
      { data: { mode: 'create' } },
    );

    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      if (this.isEditMode && this.routineId) {
        this.routineApi.addStep(this.routineId, result).subscribe({
          next: (routine) => this.syncStepsFrom(routine.steps),
          error: () => this.snackBar.open('Could not add the step', 'Dismiss', { duration: 3000 }),
        });
      } else {
        this.steps.update((current) => [...current, { ...result, id: crypto.randomUUID() }]);
      }
    });
  }

  protected openEditStepDialog(step: DraftStep): void {
    const ref = this.dialog.open<RoutineStepFormDialog, RoutineStepFormDialogData, CreateRoutineStepRequest>(
      RoutineStepFormDialog,
      { data: { mode: 'edit', step } },
    );

    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      if (this.isEditMode && this.routineId) {
        this.routineApi.updateStep(this.routineId, step.id, result).subscribe({
          next: (routine) => this.syncStepsFrom(routine.steps),
          error: () => this.snackBar.open('Could not update the step', 'Dismiss', { duration: 3000 }),
        });
      } else {
        this.steps.update((current) => current.map((existing) => (existing.id === step.id ? { ...result, id: step.id } : existing)));
      }
    });
  }

  protected removeStep(step: DraftStep): void {
    if (this.isEditMode && this.routineId) {
      this.routineApi.removeStep(this.routineId, step.id).subscribe({
        next: (routine) => this.syncStepsFrom(routine.steps),
        error: () => this.snackBar.open('Could not remove the step', 'Dismiss', { duration: 3000 }),
      });
    } else {
      this.steps.update((current) => current.filter((existing) => existing.id !== step.id));
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();

    if (this.isEditMode && this.routineId) {
      this.routineApi
        .update(this.routineId, { name: raw.name, icon: raw.icon, color: raw.color, description: raw.description || undefined })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.snackBar.open('Routine updated', 'Dismiss', { duration: 3000 });
            void this.router.navigate(['/routines', this.routineId]);
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open('Could not save the routine', 'Dismiss', { duration: 3000 });
          },
        });
      return;
    }

    this.routineApi
      .create({
        name: raw.name,
        icon: raw.icon,
        color: raw.color,
        description: raw.description || undefined,
        steps: this.steps().map((step) => ({
          title: step.title,
          startTime: step.startTime,
          durationMinutes: step.durationMinutes,
          reminderMinutesBefore: step.reminderMinutesBefore,
          isRequired: step.isRequired,
        })),
      })
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          this.snackBar.open('Routine created', 'Dismiss', { duration: 3000 });
          void this.router.navigate(['/routines', created.id]);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Could not create the routine', 'Dismiss', { duration: 3000 });
        },
      });
  }

  protected cancel(): void {
    void this.router.navigate(this.isEditMode && this.routineId ? ['/routines', this.routineId] : ['/routines']);
  }

  private syncStepsFrom(steps: RoutineStep[]): void {
    this.steps.set(
      [...steps]
        .sort((a, b) => a.order - b.order)
        .map((step) => ({
          id: step.id,
          title: step.title,
          startTime: step.startTime,
          durationMinutes: step.durationMinutes,
          reminderMinutesBefore: step.reminderMinutesBefore ?? undefined,
          isRequired: step.isRequired,
        })),
    );
  }
}
