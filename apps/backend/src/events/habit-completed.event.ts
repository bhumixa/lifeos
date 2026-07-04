/** Emitted by HabitsService.createLog — "completed" here means "logged", the same vocabulary
 * HabitsService's own `completedToday`/`completedCount` fields already use. */
export class HabitCompletedEvent {
  constructor(
    readonly userId: string,
    readonly habitId: string,
    readonly habitName: string,
    /** "YYYY-MM-DD" — the date the log was recorded for, not necessarily today. */
    readonly date: string,
  ) {}
}
