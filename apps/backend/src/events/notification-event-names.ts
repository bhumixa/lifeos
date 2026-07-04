/**
 * String event names for EventEmitter2's `emit`/`@OnEvent` — one per domain event class in this
 * folder. Centralized here (rather than each emitter/listener hand-writing its own string) so a
 * typo in either the emitting service or NotificationSchedulerService's `@OnEvent` decorator is a
 * compile error instead of a silently-never-fired listener.
 */
export const NOTIFICATION_EVENTS = {
  TASK_COMPLETED: 'task.completed',
  HABIT_COMPLETED: 'habit.completed',
  PLANNER_BLOCK_COMPLETED: 'planner-block.completed',
  GOAL_COMPLETED: 'goal.completed',
  JOURNAL_CREATED: 'journal.created',
  ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',
  CALENDAR_EVENT_STARTING: 'calendar-event.starting',
} as const;
