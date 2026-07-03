import type { PaginatedResult, SortOrder } from './task.types.js';

export type GoalStatus = 'NOT_STARTED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** What GET /goals/:id/progress recomputes currentValue from — one automatic source per type
 * (Tasks/Habits/Routine/Planner, via that entity's own optional goalId link), except CUSTOM,
 * which has no automatic source and only changes via PATCH /goals/:id. */
export type GoalTargetType =
  | 'TASK_COUNT'
  | 'HABIT_COMPLETION'
  | 'ROUTINE_COMPLETION'
  | 'FOCUS_TIME'
  | 'CUSTOM';

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  /** "YYYY-MM-DD" — date-only. */
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  category: string | null;
  priority: GoalPriority;
  targetType: GoalTargetType;
  targetValue: number;
  /** Stored, not fully derived on every read — see GoalProgress below for the endpoint that
   * actually recomputes it from source data. */
  currentValue: number;
  /** currentValue / targetValue, capped at 100 — computed from whatever's currently stored. */
  progressPercent: number;
  /** "YYYY-MM-DD" — date-only. */
  startDate: string | null;
  /** "YYYY-MM-DD" — date-only. */
  targetDate: string | null;
  status: GoalStatus;
  archived: boolean;
  milestones: GoalMilestone[];
  milestonesCompletedCount: number;
  milestonesTotalCount: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /goals/:id/progress's response — the one call that recomputes+persists currentValue from
 * Task/Habit/Routine/Planner source data for the four automatic target types. */
export interface GoalProgress {
  goalId: string;
  targetType: GoalTargetType;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  remainingValue: number;
  isComplete: boolean;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  icon: string;
  color: string;
  category?: string;
  priority?: GoalPriority;
  status?: GoalStatus;
  targetType: GoalTargetType;
  targetValue: number;
  /** Only meaningful for CUSTOM goals — automatic target types get this recomputed on the first
   * GET /goals/:id/progress call regardless of what's sent here. */
  currentValue?: number;
  startDate?: string;
  targetDate?: string;
}

export type UpdateGoalRequest = Partial<CreateGoalRequest>;

export type GoalSortBy = 'createdAt' | 'title' | 'targetDate' | 'priority' | 'progressPercent';

export interface GoalQueryParams {
  search?: string;
  status?: GoalStatus;
  priority?: GoalPriority;
  targetType?: GoalTargetType;
  category?: string;
  /** Defaults to excluding archived goals server-side when omitted. */
  archived?: boolean;
  sortBy?: GoalSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface CreateGoalMilestoneRequest {
  title: string;
  description?: string;
  dueDate?: string;
  order?: number;
}

export type UpdateGoalMilestoneRequest = Partial<CreateGoalMilestoneRequest> & {
  completed?: boolean;
};

export type PaginatedGoals = PaginatedResult<Goal>;

/** Dashboard-facing flat summary — mirrors HabitSummary's role for the habits feature. */
export interface GoalSummary {
  activeCount: number;
  completedCount: number;
  completionPercentage: number;
  nearestDeadline: { goalId: string; title: string; targetDate: string } | null;
}
