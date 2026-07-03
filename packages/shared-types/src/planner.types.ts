export type PlannerBlockType = 'TASK' | 'ROUTINE' | 'HABIT' | 'FOCUS' | 'BREAK' | 'CUSTOM';

export interface PlannerBlock {
  id: string;
  plannerDayId: string;
  type: PlannerBlockType;
  /** Task.id / RoutineStep.id / Habit.id depending on `type`; null for FOCUS/BREAK/CUSTOM. */
  referenceId: string | null;
  title: string;
  description: string | null;
  /** ISO datetime. */
  startTime: string;
  /** ISO datetime. */
  endTime: string;
  /** Minutes; derived server-side from (endTime - startTime), never trusted from the client. */
  duration: number;
  color: string | null;
  completed: boolean;
  order: number;
  /** Milestone 9: optional Goal this block directly contributes to (independent of
   * type/referenceId) — powers FOCUS_TIME progress. */
  goalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerDay {
  id: string;
  /** "YYYY-MM-DD". */
  date: string;
  notes: string | null;
  blocks: PlannerBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlannerBlockRequest {
  /** "YYYY-MM-DD"; defaults to today (in the user's timezone) when omitted. */
  date?: string;
  type: PlannerBlockType;
  referenceId?: string;
  title: string;
  description?: string;
  /** ISO datetime. */
  startTime: string;
  /** ISO datetime. */
  endTime: string;
  color?: string;
  order?: number;
  /** Milestone 9: optional Goal this block directly contributes to (must belong to the same
   * user). */
  goalId?: string;
}

export type UpdatePlannerBlockRequest = Partial<Omit<CreatePlannerBlockRequest, 'date'>>;

export interface ReorderPlannerBlocksRequest {
  date: string;
  /** All of that date's block IDs, in the desired display order. */
  blockIds: string[];
}

export interface CompletePlannerBlockRequest {
  blockId: string;
  /** Defaults to true — pass false to un-complete a block. */
  completed?: boolean;
}

export interface GeneratePlannerRequest {
  date?: string;
  /** Minutes of buffer left between generated blocks. Defaults server-side. */
  bufferMinutes?: number;
}

export interface GeneratePlannerResult extends PlannerDay {
  /** IDs of tasks/habits that were due today but didn't fit anywhere in the day window —
   * surfaced instead of silently dropped, so the UI can tell the user. */
  unscheduledTaskIds: string[];
  unscheduledHabitIds: string[];
}
