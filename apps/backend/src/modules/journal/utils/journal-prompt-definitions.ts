import { JournalType } from '../../../../generated/prisma/index.js';

/**
 * Single source of truth for the reflection-prompt catalog — every row JournalService upserts
 * into the `journal_prompts` table (see the schema comment on JournalPrompt) comes from this one
 * array, the same "data-driven, not hardcoded in a controller" pattern
 * modules/streaks/utils/achievement-definitions.ts already established for the achievement
 * catalog. `order` is the display order within a `type`, not a global ranking.
 */
export interface JournalPromptDefinition {
  code: string;
  type: JournalType;
  question: string;
  placeholder?: string;
  order: number;
}

export const JOURNAL_PROMPT_DEFINITIONS: JournalPromptDefinition[] = [
  // Morning — mirrors this milestone's "Morning Journal" field list.
  {
    code: 'MORNING_INTENTION',
    type: JournalType.MORNING,
    question: "What's your intention for today?",
    placeholder: 'e.g. Stay focused on one thing at a time.',
    order: 0,
  },
  {
    code: 'MORNING_TOP_PRIORITIES',
    type: JournalType.MORNING,
    question: 'What are your top 3 priorities today?',
    placeholder: 'e.g. Finish the proposal, call the dentist, go for a run.',
    order: 1,
  },
  {
    code: 'MORNING_AFFIRMATION',
    type: JournalType.MORNING,
    question: "What's an affirmation to carry with you today?",
    placeholder: 'e.g. I handle challenges calmly and clearly.',
    order: 2,
  },
  {
    code: 'MORNING_VISUALIZATION',
    type: JournalType.MORNING,
    question: 'Picture the day going well — what does that look like?',
    placeholder:
      'e.g. I leave my desk at a reasonable hour with a clear inbox.',
    order: 3,
  },
  {
    code: 'MORNING_EXPECTED_CHALLENGES',
    type: JournalType.MORNING,
    question: 'What might get in the way today?',
    placeholder: 'e.g. A packed calendar could crowd out deep work.',
    order: 4,
  },
  // Evening — mirrors this milestone's "Evening Journal" field list.
  {
    code: 'EVENING_WENT_WELL',
    type: JournalType.EVENING,
    question: 'What went well today?',
    order: 0,
  },
  {
    code: 'EVENING_WENT_WRONG',
    type: JournalType.EVENING,
    question: "What didn't go as planned?",
    order: 1,
  },
  {
    code: 'EVENING_LESSONS',
    type: JournalType.EVENING,
    question: 'What did you learn today?',
    order: 2,
  },
  {
    code: 'EVENING_GRATITUDE',
    type: JournalType.EVENING,
    question: 'What are you grateful for today?',
    placeholder: 'e.g. A good conversation with a friend.',
    order: 3,
  },
  {
    code: 'EVENING_WINS',
    type: JournalType.EVENING,
    question: "What were today's wins, big or small?",
    order: 4,
  },
  {
    code: 'EVENING_PLANNER_REFLECTION',
    type: JournalType.EVENING,
    question: 'How closely did you follow your planned schedule?',
    order: 5,
  },
  {
    code: 'EVENING_HABIT_REFLECTION',
    type: JournalType.EVENING,
    question: 'How did your habits go today?',
    order: 6,
  },
  {
    code: 'EVENING_GOAL_REFLECTION',
    type: JournalType.EVENING,
    question: 'Did today move you closer to any of your goals?',
    order: 7,
  },
  {
    code: 'EVENING_TOMORROW_PLAN',
    type: JournalType.EVENING,
    question: 'What matters most tomorrow?',
    order: 8,
  },
  // Freeform — general-purpose prompts for an unstructured entry.
  {
    code: 'FREEFORM_WHATS_ON_YOUR_MIND',
    type: JournalType.FREEFORM,
    question: "What's on your mind right now?",
    order: 0,
  },
  {
    code: 'FREEFORM_MOMENT_WORTH_REMEMBERING',
    type: JournalType.FREEFORM,
    question: 'Describe a moment from today worth remembering.',
    order: 1,
  },
];
