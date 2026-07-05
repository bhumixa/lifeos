import { Component, computed, input } from '@angular/core';
import { Badge } from '../../../../shared/components/badge/badge';
import { confidenceVariant, formatConfidence } from '../../utils/ai-display';

/** Thin wrapper around the shared Badge component for one insight's confidence score — the same
 * "wrap a shared component, don't reinvent it" precedent Streaks' consistency-ring/Goals'
 * goal-progress-ring already set for habit-progress-ring. */
@Component({
  selector: 'app-confidence-badge',
  imports: [Badge],
  templateUrl: './confidence-badge.html',
})
export class ConfidenceBadge {
  readonly confidence = input.required<number>();

  protected readonly label = computed(() => `${formatConfidence(this.confidence())} confidence`);
  protected readonly variant = computed(() => confidenceVariant(this.confidence()));
}
