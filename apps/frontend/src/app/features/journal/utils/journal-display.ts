import type { Energy, JournalEntry, JournalType, Mood } from '@lifeos/shared-types';
import type { BadgeVariant } from '../../../shared/components/badge/badge';

export const TYPE_LABELS: Record<JournalType, string> = {
  MORNING: 'Morning',
  EVENING: 'Evening',
  FREEFORM: 'Freeform',
};

export const TYPE_ICONS: Record<JournalType, string> = {
  MORNING: 'wb_sunny',
  EVENING: 'nights_stay',
  FREEFORM: 'edit_note',
};

export const TYPE_VARIANTS: Record<JournalType, BadgeVariant> = {
  MORNING: 'warning',
  EVENING: 'info',
  FREEFORM: 'neutral',
};

export const MOOD_LABELS: Record<Mood, string> = {
  VERY_BAD: 'Very Bad',
  BAD: 'Bad',
  NEUTRAL: 'Neutral',
  GOOD: 'Good',
  EXCELLENT: 'Excellent',
};

/** One emoji per Mood — a compact, universally-readable way to render mood on a card or in a
 * calendar cell without a color legend. */
export const MOOD_EMOJI: Record<Mood, string> = {
  VERY_BAD: '😞',
  BAD: '🙁',
  NEUTRAL: '😐',
  GOOD: '🙂',
  EXCELLENT: '😄',
};

export const MOOD_ORDER: Mood[] = ['VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'EXCELLENT'];

export const ENERGY_LABELS: Record<Energy, string> = {
  VERY_LOW: 'Very Low',
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  VERY_HIGH: 'Very High',
}

export const ENERGY_ORDER: Energy[] = ['VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH'];

/** 1-5, matching the position of an Energy value along ENERGY_ORDER — the scale EnergyMeter
 * renders as filled bolts. */
export function energyLevel(energy: Energy): number {
  return ENERGY_ORDER.indexOf(energy) + 1;
}

/** A short, human line for a journal card/timeline entry — prefers the user-supplied title, then
 * falls back to a generic "<Type> journal" label so a card is never blank. */
export function entryHeadline(entry: Pick<JournalEntry, 'title' | 'type'>): string {
  return entry.title?.trim() || `${TYPE_LABELS[entry.type]} journal`;
}

/** A one-line preview of an entry's free-text body — whichever field is most representative for
 * its type, truncated for card display. */
export function entryPreview(entry: JournalEntry, maxLength = 140): string {
  const source =
    entry.content ||
    entry.intention ||
    entry.wentWell ||
    entry.gratitude[0] ||
    '';
  return source.length > maxLength ? `${source.slice(0, maxLength).trimEnd()}…` : source;
}

/** "YYYY-MM-DD" -> "Jul 4, 2026", used anywhere an entry's date needs a friendly label. Parsed
 * as a UTC date-only value (matching how the backend stores/returns it) so no local-timezone
 * shift moves the displayed date by a day. */
export function formatEntryDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** A local `Date` (e.g. from a Material datepicker) -> "YYYY-MM-DD", the same convention
 * GoalEditorPage's own private toDateOnly already uses. */
export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
