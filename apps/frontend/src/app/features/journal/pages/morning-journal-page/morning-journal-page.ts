import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { CreateJournalEntryRequest, Goal, JournalPrompt } from '@lifeos/shared-types';
import { GoalApiService } from '../../../goals/services/goal-api.service';
import { PlannerApiService } from '../../../planner/services/planner-api.service';
import { EnergyMeter } from '../../components/energy-meter/energy-meter';
import { MoodSelector } from '../../components/mood-selector/mood-selector';
import { PromptCard } from '../../components/prompt-card/prompt-card';
import { RichTextEditor } from '../../components/rich-text-editor/rich-text-editor';
import { TagsInput } from '../../components/tags-input/tags-input';
import { JournalApiService } from '../../services/journal-api.service';
import { commonEntryControls } from '../../utils/journal-form';
import { toDateOnly } from '../../utils/journal-display';

/** Today's Morning Journal — auto-loads and switches to edit mode if today's MORNING entry
 * already exists (one-per-day, enforced server-side), otherwise stays in create mode. Silently
 * links today's PlannerDay (if one exists) so Planner's own "open today's journal" affordance and
 * a future Planner Reflection have something to point back at, without a picker UI for something
 * that's always "today's own day". */
@Component({
  selector: 'app-morning-journal-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    EnergyMeter,
    MoodSelector,
    PromptCard,
    RichTextEditor,
    TagsInput,
  ],
  templateUrl: './morning-journal-page.html',
  styleUrl: './morning-journal-page.scss',
})
export class MorningJournalPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly journalApi = inject(JournalApiService);
  private readonly goalApi = inject(GoalApiService);
  private readonly plannerApi = inject(PlannerApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly today = toDateOnly(new Date());
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly goals = signal<Goal[]>([]);
  protected readonly prompts = signal<JournalPrompt[]>([]);
  private plannerDayId: string | null = null;

  protected readonly form = this.fb.group({
    ...commonEntryControls(this.fb),
    intention: this.fb.nonNullable.control(''),
    topPriorities: this.fb.nonNullable.control<string[]>([]),
    affirmation: this.fb.nonNullable.control(''),
    visualization: this.fb.nonNullable.control(''),
    expectedChallenges: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    this.journalApi.getByDate(this.today).subscribe({
      next: (day) => {
        const existing = day.entries.find((entry) => entry.type === 'MORNING');
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
            intention: existing.intention ?? '',
            topPriorities: existing.topPriorities,
            affirmation: existing.affirmation ?? '',
            visualization: existing.visualization ?? '',
            expectedChallenges: existing.expectedChallenges ?? '',
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.goalApi.list({ archived: false, pageSize: 100 }).subscribe((result) => this.goals.set(result.data));
    this.journalApi.getPrompts('MORNING').subscribe((prompts) => this.prompts.set(prompts));
    this.plannerApi.today().subscribe((day) => (this.plannerDayId = day.id));
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
        next: () => this.onSaved(editingId, 'Morning journal updated'),
        error: () => this.onSaveError(),
      });
      return;
    }

    const request: CreateJournalEntryRequest = {
      type: 'MORNING',
      date: this.today,
      plannerDayId: this.plannerDayId ?? undefined,
      ...this.toUpdateRequest(raw),
    };
    this.journalApi.create(request).subscribe({
      next: (created) => this.onSaved(created.id, 'Morning journal saved'),
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
      intention: raw.intention || undefined,
      topPriorities: raw.topPriorities,
      affirmation: raw.affirmation || undefined,
      visualization: raw.visualization || undefined,
      expectedChallenges: raw.expectedChallenges || undefined,
    };
  }

  private onSaved(id: string, message: string): void {
    this.saving.set(false);
    this.snackBar.open(message, 'Dismiss', { duration: 3000 });
    void this.router.navigate(['/journal', this.today, id]);
  }

  private onSaveError(): void {
    this.saving.set(false);
    this.snackBar.open('Could not save the morning journal', 'Dismiss', { duration: 3000 });
  }
}
