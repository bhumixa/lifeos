import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { GoalPriority, GoalStatus, GoalTargetType } from '@lifeos/shared-types';
import { GoalApiService } from '../../services/goal-api.service';
import { GoalsStore } from '../../state/goals-store';
import { PRIORITY_LABELS, STATUS_LABELS, TARGET_TYPE_LABELS, isManualTarget } from '../../utils/goal-display';

const ICON_OPTIONS = ['flag', 'fitness_center', 'school', 'work', 'savings', 'self_improvement', 'menu_book'];
const COLOR_OPTIONS = ['#3F51B5', '#FF9800', '#4CAF50', '#E91E63', '#009688', '#795548', '#607D8B'];

/**
 * Handles both create and edit in one page (not a dialog) — matching RoutineEditorPage's
 * precedent, since the milestone brief lists "Goal Editor" as a page, not a form dialog like
 * Task/Habit use. Milestones are managed on their own dedicated page (Goal Milestones), not here.
 */
@Component({
  selector: 'app-goal-editor-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './goal-editor-page.html',
  styleUrl: './goal-editor-page.scss',
})
export class GoalEditorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly goalApi = inject(GoalApiService);
  private readonly goalsStore = inject(GoalsStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  private readonly routeId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = this.routeId !== null && this.routeId !== 'new';
  private readonly goalId = this.isEditMode ? this.routeId : null;

  protected readonly iconOptions = ICON_OPTIONS;
  protected readonly colorOptions = COLOR_OPTIONS;
  protected readonly priorities = Object.entries(PRIORITY_LABELS) as [GoalPriority, string][];
  protected readonly statuses = Object.entries(STATUS_LABELS) as [GoalStatus, string][];
  protected readonly targetTypes = Object.entries(TARGET_TYPE_LABELS) as [GoalTargetType, string][];

  protected readonly loading = signal(this.isEditMode);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    icon: [ICON_OPTIONS[0], [Validators.required]],
    color: [COLOR_OPTIONS[0], [Validators.required]],
    category: [''],
    priority: this.fb.nonNullable.control<GoalPriority>('MEDIUM'),
    status: this.fb.nonNullable.control<GoalStatus>('NOT_STARTED'),
    targetType: this.fb.nonNullable.control<GoalTargetType>('TASK_COUNT', [Validators.required]),
    targetValue: [1, [Validators.required, Validators.min(1), Validators.max(1_000_000)]],
    currentValue: [0, [Validators.min(0), Validators.max(1_000_000)]],
    startDate: this.fb.control<Date | null>(null),
    targetDate: this.fb.control<Date | null>(null),
  });

  protected showManualCurrentValue(): boolean {
    return isManualTarget(this.form.controls.targetType.value);
  }

  ngOnInit(): void {
    if (this.goalId) {
      this.loadGoal(this.goalId);
    }
  }

  private loadGoal(id: string): void {
    this.goalApi.getById(id).subscribe({
      next: (goal) => {
        this.form.patchValue({
          title: goal.title,
          description: goal.description ?? '',
          icon: goal.icon,
          color: goal.color,
          category: goal.category ?? '',
          priority: goal.priority,
          status: goal.status,
          targetType: goal.targetType,
          targetValue: goal.targetValue,
          currentValue: goal.currentValue,
          startDate: goal.startDate ? new Date(goal.startDate) : null,
          targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this goal.');
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const request = {
      title: raw.title,
      description: raw.description || undefined,
      icon: raw.icon,
      color: raw.color,
      category: raw.category || undefined,
      priority: raw.priority,
      status: raw.status,
      targetType: raw.targetType,
      targetValue: raw.targetValue,
      // Only meaningful for CUSTOM goals — GoalsService silently ignores this for every other
      // target type (see its class doc), so sending it unconditionally is harmless.
      currentValue: raw.currentValue,
      startDate: raw.startDate ? this.toDateOnly(raw.startDate) : undefined,
      targetDate: raw.targetDate ? this.toDateOnly(raw.targetDate) : undefined,
    };

    if (this.isEditMode && this.goalId) {
      this.goalsStore.updateGoal(this.goalId, request).subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open('Goal updated', 'Dismiss', { duration: 3000 });
          void this.router.navigate(['/goals', this.goalId]);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Could not save the goal', 'Dismiss', { duration: 3000 });
        },
      });
      return;
    }

    this.goalsStore.createGoal(request).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.snackBar.open('Goal created', 'Dismiss', { duration: 3000 });
        void this.router.navigate(['/goals', created.id]);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Could not create the goal', 'Dismiss', { duration: 3000 });
      },
    });
  }

  protected cancel(): void {
    void this.router.navigate(this.isEditMode && this.goalId ? ['/goals', this.goalId] : ['/goals']);
  }

  private toDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
