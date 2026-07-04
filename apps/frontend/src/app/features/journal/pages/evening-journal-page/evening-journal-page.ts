import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CreateJournalEntryRequest, Goal, HabitSummary, JournalPrompt, StreaksToday } from '@lifeos/shared-types';
import { GoalApiService } from '../../../goals/services/goal-api.service';
import { HabitApiService } from '../../../habits/services/habit-api.service';
import { PlannerApiService } from '../../../planner/services/planner-api.service';
import { StreaksApiService } from '../../../streaks/services/streaks-api.service';
import { EnergyMeter } from '../../components/energy-meter/energy-meter';
import { GratitudeWidget } from '../../components/gratitude-widget/gratitude-widget';
import { MoodSelector } from '../../components/mood-selector/mood-selector';
import { PromptCard } from '../../components/prompt-card/prompt-card';
import { RichTextEditor } from '../../components/rich-text-editor/rich-text-editor';
import { TagsInput } from '../../components/tags-input/tags-input';
import { JournalApiService } from '../../services/journal-api.service';
import { toDateOnly } from '../../utils/journal-display';
import { commonEntryControls } from '../../utils/journal-form';

/** Today's Evening Journal — same auto-load/edit-or-create shape as MorningJournalPage. Also
 * where the milestone's "Habits: display completion summary" / "Streaks: show current streak
 * while journaling" integration lives: both are read-only panels composed from Habits'/Streaks'
 * own existing endpoints (GET /habits/summary, GET /streaks/today) rather than a Journal-specific
 * summary endpoint, per docs/05-architecture.md's "avoid creating unnecessary dashboard-specific
 * endpoints" rule applied here to a feature page instead of the Dashboard itself. */
@Component({
  selector: 'app-evening-journal-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    EnergyMeter,
    GratitudeWidget,
    MoodSelector,
    PromptCard,
    RichTextEditor,
    TagsInput,
  ],
  templateUrl: './evening-journal-page.html',
  styleUrl: './evening-journal-page.scss',
})
export class EveningJournalPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly journalApi = inject(JournalApiService);
  private readonly goalApi = inject(GoalApiService);
  private readonly plannerApi = inject(PlannerApiService);
  private readonly habitApi = inject(HabitApiService);
  private readonly streaksApi = inject(StreaksApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly today = toDateOnly(new Date());
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly goals = signal<Goal[]>([]);
  protected readonly prompts = signal<JournalPrompt[]>([]);
  protected readonly habitSummary = signal<HabitSummary | null>(null);
  protected readonly streaksToday = signal<StreaksToday | null>(null);
  private plannerDayId: string | null = null;

  protected readonly form = this.fb.group({
    ...commonEntryControls(this.fb),
    wentWell: this.fb.nonNullable.control(''),
    wentWrong: this.fb.nonNullable.control(''),
    lessons: this.fb.nonNullable.control(''),
    gratitude: this.fb.nonNullable.control<string[]>([]),
    wins: this.fb.nonNullable.control<string[]>([]),
    plannerReflection: this.fb.nonNullable.control(''),
    habitReflection: this.fb.nonNullable.control(''),
    goalReflection: this.fb.nonNullable.control(''),
    tomorrowPlan: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    this.journalApi.getByDate(this.today).subscribe({
      next: (day) => {
        const existing = day.entries.find((entry) => entry.type === 'EVENING');
        if (existing) {
          this.editingId.set(existing.id);
          this.form.patchValue({
            title: existing.title ?? '',
            content: existing.content ?? '',
            mood: existing.mood,
            energy: existing.energy,
            tags: existing.tags,
            weather: existing.weather ?? '',
            location: existing.location ?? '',
            goalId: existing.goalId,
            wentWell: existing.wentWell ?? '',
            wentWrong: existing.wentWrong ?? '',
            lessons: existing.lessons ?? '',
            gratitude: existing.gratitude,
            wins: existing.wins,
            plannerReflection: existing.plannerReflection ?? '',
            habitReflection: existing.habitReflection ?? '',
            goalReflection: existing.goalReflection ?? '',
            tomorrowPlan: existing.tomorrowPlan ?? '',
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.goalApi.list({ archived: false, pageSize: 100 }).subscribe((result) => this.goals.set(result.data));
    this.journalApi.getPrompts('EVENING').subscribe((prompts) => this.prompts.set(prompts));
    this.plannerApi.today().subscribe((day) => (this.plannerDayId = day.id));
    this.habitApi.summary().subscribe((summary) => this.habitSummary.set(summary));
    this.streaksApi.today().subscribe((streak) => this.streaksToday.set(streak));
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const editingId = this.editingId();

    if (editingId) {
      this.journalApi.update(editingId, this.toUpdateRequest(raw)).subscribe({
        next: () => this.onSaved(editingId, 'Evening journal updated'),
        error: () => this.onSaveError(),
      });
      return;
    }

    const request: CreateJournalEntryRequest = {
      type: 'EVENING',
      date: this.today,
      plannerDayId: this.plannerDayId ?? undefined,
      ...this.toUpdateRequest(raw),
    };
    this.journalApi.create(request).subscribe({
      next: (created) => this.onSaved(created.id, 'Evening journal saved'),
      error: () => this.onSaveError(),
    });
  }

  private toUpdateRequest(raw: ReturnType<typeof this.form.getRawValue>) {
    return {
      title: raw.title || undefined,
      content: raw.content || undefined,
      mood: raw.mood ?? undefined,
      energy: raw.energy ?? undefined,
      tags: raw.tags,
      weather: raw.weather || undefined,
      location: raw.location || undefined,
      goalId: raw.goalId ?? undefined,
      wentWell: raw.wentWell || undefined,
      wentWrong: raw.wentWrong || undefined,
      lessons: raw.lessons || undefined,
      gratitude: raw.gratitude,
      wins: raw.wins,
      plannerReflection: raw.plannerReflection || undefined,
      habitReflection: raw.habitReflection || undefined,
      goalReflection: raw.goalReflection || undefined,
      tomorrowPlan: raw.tomorrowPlan || undefined,
    };
  }

  private onSaved(id: string, message: string): void {
    this.saving.set(false);
    this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    void this.router.navigate(['/journal', this.today, id]);
  }

  private onSaveError(): void {
    this.saving.set(false);
    this.snackBar.open('Could not save the evening journal', 'Dismiss', { duration: 3000 });
  }
}
