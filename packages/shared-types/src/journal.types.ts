import type { PaginatedResult, SortOrder } from './task.types.js';

export type JournalType = 'MORNING' | 'EVENING' | 'FREEFORM';
export type Mood = 'VERY_BAD' | 'BAD' | 'NEUTRAL' | 'GOOD' | 'EXCELLENT';
export type Energy = 'VERY_LOW' | 'LOW' | 'NORMAL' | 'HIGH' | 'VERY_HIGH';

export interface JournalAttachment {
  id: string;
  journalId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  createdAt: string;
}

/** A single row in the user's personal timeline — one wide shape covering all three JournalType
 * variants, with type-specific fields left null by whichever type doesn't use them (see the
 * schema comment on JournalEntry in prisma/schema.prisma). */
export interface JournalEntry {
  id: string;
  /** "YYYY-MM-DD" — date-only, in the user's own timezone. */
  date: string;
  type: JournalType;
  title: string | null;
  content: string | null;
  mood: Mood | null;
  energy: Energy | null;
  /** Self-rated, 1-5. */
  productivity: number | null;
  gratitude: string[];
  wins: string[];
  lessons: string | null;
  tomorrowPlan: string | null;
  tags: string[];
  weather: string | null;
  location: string | null;
  /** Morning-only. */
  intention: string | null;
  /** Morning-only. */
  topPriorities: string[];
  /** Morning-only. */
  affirmation: string | null;
  /** Morning-only. */
  visualization: string | null;
  /** Morning-only. */
  expectedChallenges: string | null;
  /** Evening-only. */
  wentWell: string | null;
  /** Evening-only. */
  wentWrong: string | null;
  /** Evening-only. */
  plannerReflection: string | null;
  /** Evening-only. */
  habitReflection: string | null;
  /** Evening-only. */
  goalReflection: string | null;
  /** Optional link to a Goal this entry reflects on. */
  goalId: string | null;
  /** Optional link to the PlannerDay this entry reflects on. */
  plannerDayId: string | null;
  attachments: JournalAttachment[];
  createdAt: string;
  updatedAt: string;
}

/** GET /journal/:date's response — every entry for that calendar date (0-2 MORNING/EVENING plus
 * any number of FREEFORM), the same "whole day" shape PlannerDay already returns. */
export interface JournalDay {
  /** "YYYY-MM-DD". */
  date: string;
  entries: JournalEntry[];
}

export interface JournalPrompt {
  id: string;
  code: string;
  type: JournalType;
  question: string;
  placeholder: string | null;
  order: number;
  active: boolean;
}

export interface CreateJournalEntryRequest {
  /** "YYYY-MM-DD"; defaults to today (in the user's timezone) when omitted. */
  date?: string;
  /** MORNING/EVENING are limited to one per calendar day; FREEFORM has no such limit. */
  type: JournalType;
  title?: string;
  content?: string;
  mood?: Mood;
  energy?: Energy;
  productivity?: number;
  gratitude?: string[];
  wins?: string[];
  lessons?: string;
  tomorrowPlan?: string;
  tags?: string[];
  weather?: string;
  location?: string;
  intention?: string;
  topPriorities?: string[];
  affirmation?: string;
  visualization?: string;
  expectedChallenges?: string;
  wentWell?: string;
  wentWrong?: string;
  plannerReflection?: string;
  habitReflection?: string;
  goalReflection?: string;
  /** Must belong to the same user. */
  goalId?: string;
  /** Must belong to the same user. */
  plannerDayId?: string;
}

/** `date`/`type` can't change via PATCH — create a new entry instead. */
export type UpdateJournalEntryRequest = Partial<
  Omit<CreateJournalEntryRequest, 'date' | 'type'>
>;

export type JournalSortBy = 'date' | 'createdAt';

export interface JournalQueryParams {
  type?: JournalType;
  sortBy?: JournalSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface JournalHistoryQueryParams {
  type?: JournalType;
  /** Inclusive lower bound on date. */
  dateFrom?: string;
  /** Inclusive upper bound on date. */
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/** GET /journal/search's rich filter set. `tag` is a single-value filter (entries containing that
 * tag), matching TaskQueryParams's own single-`tag` convention. */
export interface JournalSearchQueryParams {
  /** Case-insensitive match against title or content. */
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  mood?: Mood;
  energy?: Energy;
  tag?: string;
  goalId?: string;
  type?: JournalType;
  sortBy?: JournalSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface CreateJournalAttachmentRequest {
  /** The JournalEntry this attachment belongs to (same user only). */
  journalId: string;
  fileName: string;
  fileType: string;
  /** Bytes. */
  fileSize: number;
  /** Wherever the client already hosted the file — no binary upload endpoint exists. */
  url: string;
}

export type PaginatedJournalEntries = PaginatedResult<JournalEntry>;
