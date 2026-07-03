export interface RoutineStep {
  id: string;
  routineId: string;
  title: string;
  /** "HH:mm", 24-hour, local time-of-day — a routine repeats daily, so there's no date for a
   * full timestamp to belong to. */
  startTime: string;
  durationMinutes: number;
  order: number;
  reminderMinutesBefore: number | null;
  isRequired: boolean;
}

export interface Routine {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  isActive: boolean;
  /** Milestone 9: optional Goal this routine contributes to. */
  goalId: string | null;
  steps: RoutineStep[];
  /** Sum of steps[].durationMinutes — computed server-side, not stored. */
  totalDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoutineStepRequest {
  title: string;
  startTime: string;
  durationMinutes: number;
  reminderMinutesBefore?: number;
  isRequired?: boolean;
}

export interface CreateRoutineRequest {
  name: string;
  icon: string;
  color: string;
  description?: string;
  isActive?: boolean;
  /** Optional initial steps, in display order — lets the Routine Editor save a routine and its
   * steps in one request instead of N+1. */
  steps?: CreateRoutineStepRequest[];
  /** Milestone 9: optional Goal this routine contributes to (must belong to the same user). */
  goalId?: string;
}

export type UpdateRoutineRequest = Partial<Omit<CreateRoutineRequest, 'steps'>>;
export type UpdateRoutineStepRequest = Partial<CreateRoutineStepRequest>;

export interface ReorderRoutineStepsRequest {
  /** All of the routine's step IDs, in the desired display order. */
  stepIds: string[];
}
