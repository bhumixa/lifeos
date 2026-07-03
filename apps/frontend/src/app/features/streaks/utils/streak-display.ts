import type { DailyHistoryEntry } from '@lifeos/shared-types';
import { heatmapLevel, type HeatmapCell } from '../../habits/utils/habit-display';

/** Reuses the Habit feature's `heatmapLevel`/`HeatmapCell` grading (see
 * features/habits/utils/habit-display.ts) rather than re-deriving intensity buckets — a day's
 * `completedCount`/`totalCount` here (how many of the user's active daily habits succeeded that
 * day) grades the same way a single habit's `completedCount`/`targetCount` does. */
export function toHeatmapCells(history: readonly DailyHistoryEntry[]): HeatmapCell[] {
  return history.map((day) => ({
    date: day.date,
    completedCount: day.completedCount,
    level: heatmapLevel(day.completedCount, Math.max(1, day.totalCount)),
  }));
}

export function formatXp(xp: number): string {
  return `${xp.toLocaleString()} XP`;
}

/** Coarse qualitative label for a consistency/success percentage — used by Success Meter and
 * Consistency Ring so the number isn't the only signal. */
export function consistencyLabel(percent: number): string {
  if (percent >= 90) {
    return 'Excellent';
  }
  if (percent >= 70) {
    return 'Good';
  }
  if (percent >= 40) {
    return 'Fair';
  }
  return 'Needs work';
}
