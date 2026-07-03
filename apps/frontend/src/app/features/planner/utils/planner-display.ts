import type { PlannerBlock, PlannerBlockType } from '@lifeos/shared-types';
import type { BadgeVariant } from '../../../shared/components/badge/badge';

export const TYPE_LABELS: Record<PlannerBlockType, string> = {
  TASK: 'Task',
  ROUTINE: 'Routine',
  HABIT: 'Habit',
  FOCUS: 'Focus',
  BREAK: 'Break',
  CUSTOM: 'Custom',
};

export const TYPE_ICONS: Record<PlannerBlockType, string> = {
  TASK: 'checklist',
  ROUTINE: 'event_repeat',
  HABIT: 'repeat',
  FOCUS: 'timer',
  BREAK: 'coffee',
  CUSTOM: 'event',
};

export const TYPE_VARIANTS: Record<PlannerBlockType, BadgeVariant> = {
  TASK: 'info',
  ROUTINE: 'neutral',
  HABIT: 'success',
  FOCUS: 'warning',
  BREAK: 'neutral',
  CUSTOM: 'neutral',
};

/** Fallback swatch used only when a block has no `color` of its own — generated ROUTINE/HABIT
 * blocks currently don't copy the source Routine/Habit's color (see PlannerService.generate),
 * so this is what gives them a distinct look until a user picks one explicitly. */
export const TYPE_FALLBACK_COLOR: Record<PlannerBlockType, string> = {
  TASK: '#3F51B5',
  ROUTINE: '#009688',
  HABIT: '#4CAF50',
  FOCUS: '#FF9800',
  BREAK: '#9E9E9E',
  CUSTOM: '#607D8B',
};

export function blockColor(block: Pick<PlannerBlock, 'type' | 'color'>): string {
  return block.color ?? TYPE_FALLBACK_COLOR[block.type];
}

/** ISO datetime -> "9:00 AM", in the viewer's local timezone (the browser does this for free via
 * Date/toLocaleTimeString — no server round-trip or IANA-zone math needed on this side). */
export function formatTimeOfDay(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** 95 -> "1h 35m"; 45 -> "45m"; 0 -> "0m". Small feature-local copy, same as Habit keeps its own
 * copy of Routine's formatDuration rather than importing across feature boundaries for one
 * helper (see habit-display.ts's formatReminderTime comment for the precedent). */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** Formats a Date as "YYYY-MM-DD" using its *local* calendar date — deliberately not
 * `date.toISOString().slice(0, 10)`, which converts to UTC first and silently rolls the date
 * backward by one for any positive UTC offset. Same fix Habit's toLocalDateString documents. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calendar-date arithmetic in the viewer's local timezone — used for the Day View's
 * previous/next navigation and the Week View's 7-day range. Building the Date from local
 * year/month/day components (not parsing "YYYY-MM-DD" directly, which JS treats as UTC) keeps
 * this consistent with `toLocalDateString`. */
export function addDaysToLocalDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return toLocalDateString(new Date(year, month - 1, day + days));
}

/** Minutes since local midnight for an ISO datetime — used to position a block vertically in the
 * Time Grid. */
export function minutesSinceMidnight(isoDateTime: string): number {
  const date = new Date(isoDateTime);
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * IDs of every block that overlaps at least one other block on the same day — pure, so the
 * Planner Timeline (to highlight a block) and the Conflict Warning banner (to count/list them)
 * share one source of truth instead of two slightly different overlap checks. The backend allows
 * overlapping blocks to be created (see PlannerService — only the deterministic generator avoids
 * overlap on its own output); flagging them here, client-side, is how a manually-created conflict
 * surfaces to the user instead of being silently invisible.
 */
export function detectConflicts(blocks: Pick<PlannerBlock, 'id' | 'startTime' | 'endTime'>[]): Set<string> {
  const conflicting = new Set<string>();

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      const overlaps = new Date(a.startTime) < new Date(b.endTime) && new Date(b.startTime) < new Date(a.endTime);
      if (overlaps) {
        conflicting.add(a.id);
        conflicting.add(b.id);
      }
    }
  }

  return conflicting;
}
