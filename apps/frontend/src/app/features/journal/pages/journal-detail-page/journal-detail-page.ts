import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Goal, JournalEntry, JournalPrompt } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { GoalApiService } from '../../../goals/services/goal-api.service';
import { EnergyMeter } from '../../components/energy-meter/energy-meter';
import { GratitudeWidget } from '../../components/gratitude-widget/gratitude-widget';
import { MoodSelector } from '../../components/mood-selector/mood-selector';
import { ReflectionQuestions } from '../../components/reflection-questions/reflection-questions';
import { RichTextEditor } from '../../components/rich-text-editor/rich-text-editor';
import { TagsInput } from '../../components/tags-input/tags-input';
import { JournalApiService } from '../../services/journal-api.service';
import {
  MOOD_EMOJI,
  TYPE_ICONS,
  TYPE_LABELS,
  TYPE_VARIANTS,
  entryHeadline,
  formatEntryDate,
} from '../../utils/journal-display';
import { commonEntryControls } from '../../utils/journal-form';

/** View + edit + delete for one entry, addressed by "YYYY-MM-DD"/id (route `:date/:id`) rather
 * than a plain `/journal/:id` — GET /journal/:date already returns the whole day's entries (the
 * same shape PlannerDayResponseDto returns for its own day), so this finds the requested id
 * within that response instead of needing a dedicated by-id backend endpoint. */
@Component({
  selector: 'app-journal-detail-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    Badge,
    EmptyState,
    Skeleton,
    EnergyMeter,
    GratitudeWidget,
    MoodSelector,
    ReflectionQuestions,
    RichTextEditor,
    TagsInput,
  ],
  templateUrl: './journal-detail-page.html',
  styleUrl: './journal-detail-page.scss',
})
export class JournalDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly journalApi = inject(JournalApiService);
  private readonly goalApi = inject(GoalApiService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly date = this.route.snapshot.paramMap.get('date') ?? '';
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  protected readonly notFound = signal(false);
  protected readonly entry = signal<JournalEntry | null>(null);
  protected readonly prompts = signal<JournalPrompt[]>([]);
  protected readonly goals = signal<Goal[]>([]);
  protected readonly linkedGoal = signal<Goal | null>(null);

  protected readonly typeIcons = TYPE_ICONS;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly typeVariants = TYPE_VARIANTS;
  protected readonly moodEmoji = MOOD_EMOJI;

  protected readonly form = this.fb.group({
    ...commonEntryControls(this.fb),
    intention: this.fb.nonNullable.control(''),
    topPriorities: this.fb.nonNullable.control<string[]>([]),
    affirmation: this.fb.nonNullable.control(''),
    visualization: this.fb.nonNullable.control(''),
    expectedChallenges: this.fb.nonNullable.control(''),
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
    this.journalApi.getByDate(this.date).subscribe({
      next: (day) => {
        const found = day.entries.find((e) => e.id === this.id);
        if (!found) {
          this.notFound.set(true);
          this.loading.set(false);
          return;
        }
        this.entry.set(found);
        this.patchForm(found);
        if (found.goalId) {
          this.goalApi.getById(found.goalId).subscribe((goal) => this.linkedGoal.set(goal));
        }
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });

    this.goalApi.list({ archived: false, pageSize: 100 }).subscribe((result) => this.goals.set(result.data));
    this.journalApi.getPrompts().subscribe((prompts) => this.prompts.set(prompts));
  }

  protected headline(): string {
    const current = this.entry();
    return current ? entryHeadline(current) : '';
  }

  protected formattedDate(): string {
    return formatEntryDate(this.date);
  }

  protected startEdit(): void {
    const current = this.entry();
    if (current) {
      this.patchForm(current);
      this.editing.set(true);
    }
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected save(): void {
    const current = this.entry();
    if (!current || this.saving()) {
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();

    this.journalApi
      .update(current.id, {
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
        wentWell: raw.wentWell || undefined,
        wentWrong: raw.wentWrong || undefined,
        lessons: raw.lessons || undefined,
        gratitude: raw.gratitude,
        wins: raw.wins,
        plannerReflection: raw.plannerReflection || undefined,
        habitReflection: raw.habitReflection || undefined,
        goalReflection: raw.goalReflection || undefined,
        tomorrowPlan: raw.tomorrowPlan || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.entry.set(updated);
          this.saving.set(false);
          this.editing.set(false);
          this.snackBar.open('Journal entry updated', 'Dismiss', { duration: 3000 });
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Could not update this entry', 'Dismiss', { duration: 3000 });
        },
      });
  }

  protected delete(): void {
    const current = this.entry();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete journal entry',
        message: 'This entry will be removed from your timeline. This cannot be undone from here.',
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.journalApi.remove(current.id).subscribe({
        next: () => {
          this.snackBar.open('Journal entry deleted', 'Dismiss', { duration: 3000 });
          void this.router.navigate(['/journal/history']);
        },
        error: () => this.snackBar.open('Could not delete this entry', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  private patchForm(entry: JournalEntry): void {
    this.form.patchValue({
      title: entry.title ?? '',
      content: entry.content ?? '',
      mood: entry.mood,
      energy: entry.energy,
      tags: entry.tags,
      weather: entry.weather ?? '',
      location: entry.location ?? '',
      goalId: entry.goalId,
      intention: entry.intention ?? '',
      topPriorities: entry.topPriorities,
      affirmation: entry.affirmation ?? '',
      visualization: entry.visualization ?? '',
      expectedChallenges: entry.expectedChallenges ?? '',
      wentWell: entry.wentWell ?? '',
      wentWrong: entry.wentWrong ?? '',
      lessons: entry.lessons ?? '',
      gratitude: entry.gratitude,
      wins: entry.wins,
      plannerReflection: entry.plannerReflection ?? '',
      habitReflection: entry.habitReflection ?? '',
      goalReflection: entry.goalReflection ?? '',
      tomorrowPlan: entry.tomorrowPlan ?? '',
    });
  }
}
