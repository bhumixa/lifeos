import type { InsightType } from '@lifeos/shared-types';
import type { BadgeVariant } from '../../../shared/components/badge/badge';

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  PRODUCTIVITY: 'Productivity',
  HABITS: 'Habits',
  GOALS: 'Goals',
  PLANNER: 'Planner',
  JOURNAL: 'Journal',
  STREAKS: 'Streaks',
  SYSTEM: 'System',
};

export const INSIGHT_TYPE_ICONS: Record<InsightType, string> = {
  PRODUCTIVITY: 'trending_up',
  HABITS: 'repeat',
  GOALS: 'flag',
  PLANNER: 'calendar_month',
  JOURNAL: 'book',
  STREAKS: 'local_fire_department',
  SYSTEM: 'psychology',
};

/** Confidence is a plain 0.0-1.0 float from the backend — formatted as a whole-number percentage
 * for display, the same "derive display text from a raw number" convention priority/status label
 * maps already follow elsewhere in this codebase. */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function confidenceVariant(confidence: number): BadgeVariant {
  if (confidence >= 0.7) {
    return 'success';
  }
  if (confidence >= 0.4) {
    return 'info';
  }
  return 'neutral';
}

/** `sourceData.flags` containing `'risk'` is the one generic, cross-type signal every insight
 * type's backend template sets consistently — see docs/06-database-design.md's note on AiInsight.
 * Kept here (rather than trusting the caller to know the JSON shape) so every consumer checks it
 * the same way. */
export function isRiskInsight(sourceData: Record<string, unknown> | null): boolean {
  const flags = sourceData?.['flags'];
  return Array.isArray(flags) && flags.includes('risk');
}
