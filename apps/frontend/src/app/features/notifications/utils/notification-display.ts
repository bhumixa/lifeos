import type { NotificationPriority, NotificationType } from '@lifeos/shared-types';
import type { BadgeVariant } from '../../../shared/components/badge/badge';

export const TYPE_ICONS: Record<NotificationType, string> = {
  TASK: 'checklist',
  HABIT: 'repeat',
  PLANNER: 'calendar_month',
  GOAL: 'flag',
  JOURNAL: 'book',
  CALENDAR: 'event',
  STREAK: 'local_fire_department',
  ACHIEVEMENT: 'workspace_premium',
  SYSTEM: 'info',
};

export const TYPE_LABELS: Record<NotificationType, string> = {
  TASK: 'Task',
  HABIT: 'Habit',
  PLANNER: 'Planner',
  GOAL: 'Goal',
  JOURNAL: 'Journal',
  CALENDAR: 'Calendar',
  STREAK: 'Streak',
  ACHIEVEMENT: 'Achievement',
  SYSTEM: 'System',
};

export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_VARIANTS: Record<NotificationPriority, BadgeVariant> = {
  LOW: 'neutral',
  NORMAL: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Hand-rolled relative-time formatting (no date-library dependency, matching this codebase's
 * convention) — "Just now" / "Xm ago" / "Xh ago" / "Xd ago" / falls back to a short date once past
 * a week, the same rough granularity a notification feed needs and no finer. */
export function formatRelativeTime(instant: string | Date, now: Date = new Date()): string {
  const then = typeof instant === 'string' ? new Date(instant) : instant;
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < MINUTE_MS) {
    return 'Just now';
  }
  if (diffMs < HOUR_MS) {
    return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  }
  if (diffMs < DAY_MS) {
    return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  }
  if (diffMs < 7 * DAY_MS) {
    return `${Math.floor(diffMs / DAY_MS)}d ago`;
  }
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Buckets a notification's `createdAt` into the section NotificationTimeline groups it under —
 * a plain day-boundary comparison in the viewer's local time, the same granularity a notification
 * feed needs (unlike Planner/Journal, there's no per-user-timezone concern here: grouping is
 * relative to whoever is looking at the feed right now, not a stored calendar date). */
export function timelineGroup(createdAt: string | Date, now: Date = new Date()): 'Today' | 'Yesterday' | 'Earlier' {
  const then = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfThen.getTime()) / DAY_MS);

  if (dayDiff <= 0) {
    return 'Today';
  }
  if (dayDiff === 1) {
    return 'Yesterday';
  }
  return 'Earlier';
}
