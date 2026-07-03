import type { PaginatedResult, SortOrder } from './task.types.js';

export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  targetFrequency: HabitFrequency;
  targetCount: number;
  category: string | null;
  /** "HH:mm", 24-hour, local time-of-day — same convention as RoutineStep.startTime. */
  reminderTime: string | null;
  isActive: boolean;
  /** Sum of the current period's (day/week/month, per targetFrequency) HabitLog.completedCount —
   * computed server-side on every read, not stored. */
  currentPeriodCount: number;
  /** currentPeriodCount / targetCount, capped at 100. */
  completionPercent: number;
  /** completedCount of *today's* log specifically (0 if none) — independent of
   * targetFrequency's longer period, and what Quick Complete increments. */
  todayCount: number;
  /** todayCount > 0 — drives the Today's Habits page and the dashboard Quick Complete panel. */
  completedToday: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  /** "YYYY-MM-DD" — date-only, at most one log per habit per date. */
  date: string;
  completedCount: number;
  notes: string | null;
  createdAt: string;
}

export interface CreateHabitRequest {
  name: string;
  description?: string;
  icon: string;
  color: string;
  targetFrequency?: HabitFrequency;
  targetCount?: number;
  category?: string;
  reminderTime?: string;
  isActive?: boolean;
}

export type UpdateHabitRequest = Partial<CreateHabitRequest>;

export type HabitSortBy = 'name' | 'createdAt' | 'completionPercent' | 'targetFrequency';

export interface HabitQueryParams {
  search?: string;
  isActive?: boolean;
  targetFrequency?: HabitFrequency;
  category?: string;
  sortBy?: HabitSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface CreateHabitLogRequest {
  /** ISO date ("YYYY-MM-DD"); defaults to today (server-side) when omitted. */
  date?: string;
  completedCount?: number;
  notes?: string;
}

export type UpdateHabitLogRequest = CreateHabitLogRequest;

export interface DeleteHabitLogParams {
  date?: string;
}

export interface HabitHistoryQueryParams {
  habitId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface HabitSummary {
  habitsCompletedToday: number;
  totalActiveHabits: number;
  completionPercentage: number;
}

export type PaginatedHabits = PaginatedResult<Habit>;
export type PaginatedHabitLogs = PaginatedResult<HabitLog>;
