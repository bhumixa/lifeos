/** Maximum delivery attempts before a NotificationQueue row (and its Notification) is marked
 * FAILED — a documented placeholder constant, the same "product owner finalizes later" precedent
 * docs/03-assumptions.md (#4) already sets for FreezeDaysService.FREEZE_DAYS_PER_MONTH. */
export const MAX_DELIVERY_ATTEMPTS = 5;

const BASE_DELAY_MINUTES = 2;
const MAX_DELAY_MINUTES = 60;

/** Exponential backoff, capped — attempt 1 waits 2 minutes, attempt 2 waits 4, ... capped at
 * MAX_DELAY_MINUTES so a long losing streak doesn't push `nextAttempt` days into the future. Pure
 * so NotificationQueueService's retry math is testable without mocking Prisma, the same
 * "framework-free" shape planner/utils and streaks/utils already establish. */
export function computeBackoffMinutes(attempts: number): number {
  return Math.min(BASE_DELAY_MINUTES * 2 ** (attempts - 1), MAX_DELAY_MINUTES);
}
