import type { Habit, HabitFrequency, HabitLog } from '@lifeos/shared-types';
import type { BadgeVariant } from '../../../shared/components/badge/badge';

export const FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

export const FREQUENCY_VARIANTS: Record<HabitFrequency, BadgeVariant> = {
  DAILY: 'info',
  WEEKLY: 'neutral',
  MONTHLY: 'neutral',
};

/** "08:00" -> "8:00 AM" — same small, feature-local formatter Routine keeps for its own
 * "HH:mm" fields, rather than importing across feature boundaries for one helper. */
export function formatReminderTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const reference = new Date();
  reference.setHours(hours, minutes, 0, 0);
  return reference.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "3 of 8 today" / "2 of 3 this week" / "1 of 1 this month" — the label the progress ring and
 * habit card show under the percentage. */
export function periodLabel(frequency: HabitFrequency): string {
  switch (frequency) {
    case 'WEEKLY':
      return 'this week';
    case 'MONTHLY':
      return 'this month';
    default:
      return 'today';
  }
}

/** Formats a Date as "YYYY-MM-DD" using its *local* calendar date — deliberately not
 * `date.toISOString().slice(0, 10)`, which converts to UTC first and silently rolls the date
 * backward by one for any positive UTC offset (most of Europe, Asia, Australia) whenever local
 * midnight hasn't yet reached UTC midnight. Every "today"/date-range computation in this feature
 * goes through this helper for that reason. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

/** Buckets a day's progress into 5 intensity levels for the calendar heatmap — 0 (nothing
 * logged) through 4 (target met or exceeded), independent of how large targetCount is. */
export function heatmapLevel(completedCount: number, targetCount: number): HeatmapLevel {
  if (completedCount <= 0) {
    return 0;
  }
  const ratio = completedCount / Math.max(1, targetCount);
  if (ratio >= 1) {
    return 4;
  }
  if (ratio >= 0.66) {
    return 3;
  }
  if (ratio >= 0.33) {
    return 2;
  }
  return 1;
}

export interface HeatmapCell {
  /** "YYYY-MM-DD". */
  date: string;
  completedCount: number;
  level: HeatmapLevel;
}

/** Builds one cell per day for the last `rangeDays` days (inclusive of today), oldest first —
 * a fixed-length grid the calendar heatmap can lay out in week columns regardless of how sparse
 * `logs` is. */
export function buildHeatmapCells(
  logs: Pick<HabitLog, 'date' | 'completedCount'>[],
  targetCount: number,
  rangeDays: number,
): HeatmapCell[] {
  const countByDate = new Map(logs.map((log) => [log.date, log.completedCount]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: HeatmapCell[] = [];
  for (let offset = rangeDays - 1; offset >= 0; offset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    const iso = toLocalDateString(day);
    const completedCount = countByDate.get(iso) ?? 0;
    cells.push({ date: iso, completedCount, level: heatmapLevel(completedCount, targetCount) });
  }
  return cells;
}

/** No indicator for inactive habits — an inactive habit isn't something to nudge the user
 * about, mirroring how dueDateIndicator skips completed/cancelled tasks. */
export function reminderIndicator(habit: Pick<Habit, 'reminderTime' | 'isActive'>): string | null {
  if (!habit.reminderTime || !habit.isActive) {
    return null;
  }
  return formatReminderTime(habit.reminderTime);
}
