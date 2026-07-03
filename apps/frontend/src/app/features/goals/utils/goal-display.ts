import type { Goal, GoalPriority, GoalStatus, GoalTargetType } from '@lifeos/shared-types';
import type { BadgeVariant } from '../../../shared/components/badge/badge';

export const PRIORITY_LABELS: Record<GoalPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_VARIANTS: Record<GoalPriority, BadgeVariant> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export const STATUS_LABELS: Record<GoalStatus, string> = {
  NOT_STARTED: 'Not Started',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STATUS_VARIANTS: Record<GoalStatus, BadgeVariant> = {
  NOT_STARTED: 'neutral',
  ACTIVE: 'info',
  PAUSED: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

export const TARGET_TYPE_LABELS: Record<GoalTargetType, string> = {
  TASK_COUNT: 'Tasks completed',
  HABIT_COMPLETION: 'Habit logs',
  ROUTINE_COMPLETION: 'Routine steps completed',
  FOCUS_TIME: 'Focus minutes',
  CUSTOM: 'Custom',
};

/** Only CUSTOM goals accept a manually-typed currentValue — every other target type is
 * refreshed exclusively by GET /goals/:id/progress (see GoalApiService.progress), so the editor
 * hides the field rather than showing a value the next progress refresh would silently discard. */
export function isManualTarget(targetType: GoalTargetType): boolean {
  return targetType === 'CUSTOM';
}

export interface DeadlineIndicator {
  label: string;
  variant: BadgeVariant;
}

/** No indicator once a goal is already completed/cancelled, or has no targetDate — overdue only
 * matters for a goal still being worked toward. Same day-diff shape as Tasks' dueDateIndicator. */
export function deadlineIndicator(goal: Pick<Goal, 'targetDate' | 'status'>): DeadlineIndicator | null {
  if (!goal.targetDate || goal.status === 'COMPLETED' || goal.status === 'CANCELLED') {
    return null;
  }

  const due = new Date(goal.targetDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const dayDiff = Math.round((startOfDueDay.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  if (dayDiff < 0) {
    return { label: 'Overdue', variant: 'danger' };
  }
  if (dayDiff === 0) {
    return { label: 'Due today', variant: 'warning' };
  }
  if (dayDiff <= 7) {
    return { label: `Due in ${dayDiff}d`, variant: 'warning' };
  }
  return { label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), variant: 'neutral' };
}

/** "4 / 10 tasks completed" — the plain-language line under a goal's progress ring, reusing the
 * same target-type label the editor's dropdown shows. */
export function progressLabel(goal: Pick<Goal, 'currentValue' | 'targetValue' | 'targetType'>): string {
  const unit = TARGET_TYPE_LABELS[goal.targetType].toLowerCase();
  return `${goal.currentValue} / ${goal.targetValue} ${unit}`;
}
