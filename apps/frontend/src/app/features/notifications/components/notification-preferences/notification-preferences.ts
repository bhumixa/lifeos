import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { NotificationPreference, UpdateNotificationPreferenceRequest } from '@lifeos/shared-types';
import { NotificationsStore } from '../../state/notifications-store';

interface CategoryToggle {
  key: keyof Pick<
    UpdateNotificationPreferenceRequest,
    | 'enableTasks'
    | 'enableHabits'
    | 'enablePlanner'
    | 'enableGoals'
    | 'enableJournal'
    | 'enableCalendar'
    | 'enableStreaks'
    | 'enableAchievements'
  >;
  label: string;
}

const CATEGORY_TOGGLES: CategoryToggle[] = [
  { key: 'enableTasks', label: 'Tasks' },
  { key: 'enableHabits', label: 'Habits' },
  { key: 'enablePlanner', label: 'Planner' },
  { key: 'enableGoals', label: 'Goals' },
  { key: 'enableJournal', label: 'Journal' },
  { key: 'enableCalendar', label: 'Calendar' },
  { key: 'enableStreaks', label: 'Streaks' },
  { key: 'enableAchievements', label: 'Achievements' },
];

/** The Notification Settings page's form — quiet hours (native "HH:mm" time inputs, same
 * convention Habit.reminderTime/RoutineStep.startTime already use), timezone, per-category
 * toggles, and per-channel toggles. Builds an empty form up front and patches it once the
 * preference row actually loads (an effect watching the `preference` input), since
 * NotificationPreference is fetched asynchronously by the page. */
@Component({
  selector: 'app-notification-preferences',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
  ],
  templateUrl: './notification-preferences.html',
  styleUrl: './notification-preferences.scss',
})
export class NotificationPreferences {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(NotificationsStore);

  readonly preference = input<NotificationPreference | null>(null);

  protected readonly categoryToggles = CATEGORY_TOGGLES;
  protected readonly isSaving = signal(false);
  protected readonly saved = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    quietHoursStart: this.fb.control<string | null>(null),
    quietHoursEnd: this.fb.control<string | null>(null),
    timezone: [''],
    enableTasks: [true],
    enableHabits: [true],
    enablePlanner: [true],
    enableGoals: [true],
    enableJournal: [true],
    enableCalendar: [true],
    enableStreaks: [true],
    enableAchievements: [true],
    enableEmail: [false],
    enablePush: [false],
    enableInApp: [true],
  });

  constructor() {
    effect(() => {
      const preference = this.preference();
      if (preference) {
        this.form.patchValue(preference);
      }
    });
  }

  protected submit(): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.saved.set(false);

    const raw = this.form.getRawValue();
    const request: UpdateNotificationPreferenceRequest = {
      ...raw,
      quietHoursStart: raw.quietHoursStart || null,
      quietHoursEnd: raw.quietHoursEnd || null,
    };

    this.store.updatePreferences(request).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set('Could not save your notification preferences. Please try again.');
      },
    });
  }
}
