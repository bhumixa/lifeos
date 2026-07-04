import { Component, computed, input } from '@angular/core';
import type { JournalEntry, JournalPrompt } from '@lifeos/shared-types';

interface AnsweredPrompt {
  question: string;
  answer: string;
}

/** Maps a JournalPrompt's stable `code` (see modules/journal/utils/journal-prompt-definitions.ts
 * on the backend) to the JournalEntry field it reflects — the array-valued prompts (Top 3
 * Priorities, Gratitude, Today's Wins) are rendered by their own dedicated widgets (TagsInput/
 * GratitudeWidget) instead of here. */
const FIELD_BY_PROMPT_CODE: Partial<Record<string, keyof JournalEntry>> = {
  MORNING_INTENTION: 'intention',
  MORNING_AFFIRMATION: 'affirmation',
  MORNING_VISUALIZATION: 'visualization',
  MORNING_EXPECTED_CHALLENGES: 'expectedChallenges',
  EVENING_WENT_WELL: 'wentWell',
  EVENING_WENT_WRONG: 'wentWrong',
  EVENING_LESSONS: 'lessons',
  EVENING_PLANNER_REFLECTION: 'plannerReflection',
  EVENING_HABIT_REFLECTION: 'habitReflection',
  EVENING_GOAL_REFLECTION: 'goalReflection',
  EVENING_TOMORROW_PLAN: 'tomorrowPlan',
  FREEFORM_WHATS_ON_YOUR_MIND: 'content',
  FREEFORM_MOMENT_WORTH_REMEMBERING: 'content',
};

/** Read-only "question -> your answer" recap for Journal Detail — pairs each catalog prompt (for
 * the entry's own type) with the entry field it maps to, skipping anything left blank. */
@Component({
  selector: 'app-reflection-questions',
  templateUrl: './reflection-questions.html',
  styleUrl: './reflection-questions.scss',
})
export class ReflectionQuestions {
  readonly entry = input.required<JournalEntry>();
  readonly prompts = input<JournalPrompt[]>([]);

  protected readonly answered = computed<AnsweredPrompt[]>(() => {
    const entry = this.entry();
    return this.prompts()
      .filter((prompt) => prompt.type === entry.type)
      .map((prompt) => {
        const field = FIELD_BY_PROMPT_CODE[prompt.code];
        const value = field ? entry[field] : null;
        return { question: prompt.question, answer: typeof value === 'string' ? value : '' };
      })
      .filter((item) => item.answer.trim().length > 0);
  });
}
