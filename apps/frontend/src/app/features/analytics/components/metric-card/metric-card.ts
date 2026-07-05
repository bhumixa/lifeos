import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { formatDeltaPercent, scoreLevel, type ScoreLevel } from '../../utils/analytics-display';

/** A labeled score/count, optionally accented by a 0-100 score level and/or a delta-vs-previous
 * indicator — the Analytics-specific superset of the shared `StatCard` (which has neither), used
 * for every score/metric this feature renders (Overview's five scores, each domain's summary
 * numbers). */
@Component({
  selector: 'app-metric-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './metric-card.html',
  styleUrl: './metric-card.scss',
})
export class MetricCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input.required<string>();
  /** When set, renders a colored accent bar for this 0-100 score (see utils/analytics-display's
   * scoreLevel). Omit for plain counts (e.g. focus minutes, streak days) that aren't a 0-100 score. */
  readonly score = input<number>();
  /** When set, renders a "+8% vs last period" / "-12% vs last period" indicator underneath. */
  readonly deltaPercent = input<number>();

  protected readonly level = computed<ScoreLevel | null>(() => {
    const score = this.score();
    return score === undefined ? null : scoreLevel(score);
  });

  protected readonly deltaLabel = computed(() => {
    const delta = this.deltaPercent();
    return delta === undefined ? null : `${formatDeltaPercent(delta)} vs last period`;
  });

  protected readonly deltaDirection = computed<'up' | 'down' | 'flat'>(() => {
    const delta = this.deltaPercent() ?? 0;
    if (delta > 0) return 'up';
    if (delta < 0) return 'down';
    return 'flat';
  });
}
