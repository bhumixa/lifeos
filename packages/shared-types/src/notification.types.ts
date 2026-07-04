import type { PaginatedResult, SortOrder } from './task.types.js';

export type NotificationType =
  | 'TASK'
  | 'HABIT'
  | 'PLANNER'
  | 'GOAL'
  | 'JOURNAL'
  | 'CALENDAR'
  | 'STREAK'
  | 'ACHIEVEMENT'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

/** A single field carries both the delivery lifecycle (PENDING/QUEUED/SENT/FAILED) and the
 * user-driven post-delivery state (READ/DISMISSED) — see the class doc on Notification in
 * prisma/schema.prisma. */
export type NotificationStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'READ' | 'DISMISSED';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  /** ISO instant — when this notification becomes visible/delivered (may be later than
   * createdAt if quiet hours pushed it back). */
  scheduledFor: string;
  deliveredAt: string | null;
  readAt: string | null;
  /** Free-form, event-specific deep-link context (e.g. `{ taskId }`) — display-only. */
  payload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type PaginatedNotifications = PaginatedResult<Notification>;

export type NotificationSortBy = 'createdAt' | 'scheduledFor' | 'priority';

export interface NotificationQueryParams {
  status?: NotificationStatus;
  type?: NotificationType;
  priority?: NotificationPriority;
  sortBy?: NotificationSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

/** Dashboard-facing flat summary — mirrors GoalSummary/HabitSummary's role for their own features.
 * Derived client-side from GET /notifications / GET /notifications/unread, no dedicated backend
 * endpoint, per docs/05-architecture.md's "avoid unnecessary dashboard-specific endpoints" rule. */
export interface NotificationSummary {
  unreadCount: number;
  upcomingCount: number;
  recent: Notification[];
  upcoming: Notification[];
}

export interface NotificationPreference {
  /** "HH:mm", 24-hour, local time-of-day — same convention as Habit.reminderTime/
   * RoutineStep.startTime. Null means quiet hours are off. */
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  enableTasks: boolean;
  enableHabits: boolean;
  enablePlanner: boolean;
  enableGoals: boolean;
  enableJournal: boolean;
  enableCalendar: boolean;
  enableStreaks: boolean;
  enableAchievements: boolean;
  enableEmail: boolean;
  enablePush: boolean;
  enableInApp: boolean;
}

export type UpdateNotificationPreferenceRequest = Partial<NotificationPreference>;
