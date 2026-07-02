import type { Task, TaskPriority, TaskStatus } from '@lifeos/shared-types';
import type { BadgeVariant } from '../../../shared/components/badge/badge';

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_VARIANTS: Record<TaskPriority, BadgeVariant> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STATUS_VARIANTS: Record<TaskStatus, BadgeVariant> = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

export interface DueIndicator {
  label: string;
  variant: BadgeVariant;
}

/** No indicator for tasks with no due date, or ones already completed/cancelled — overdue only
 * matters for work that's still outstanding. */
export function dueDateIndicator(task: Pick<Task, 'dueDate' | 'status'>): DueIndicator | null {
  if (!task.dueDate || task.status === 'COMPLETED' || task.status === 'CANCELLED') {
    return null;
  }

  const due = new Date(task.dueDate);
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
  if (dayDiff === 1) {
    return { label: 'Due tomorrow', variant: 'info' };
  }
  return { label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), variant: 'neutral' };
}
