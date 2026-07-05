import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { formatDeltaPercent } from '../../utils/analytics-display';

/** "This Week: 72%" vs "Last Week: 64%" with a delta indicator — used by the Productivity
 * report/dashboard card to make a week-over-week (or period-over-period) comparison explicit
 * rather than requiring the viewer to do the subtraction themselves. */
@Component({
  selector: 'app-comparison-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './comparison-card.html',
  styleUrl: './comparison-card.scss',
})
export class ComparisonCard {
  readonly title = input.required<string>();
  readonly currentLabel = input.required<string>();
  readonly currentValue = input.required<number>();
  readonly previousLabel = input.required<string>();
  readonly previousValue = input.required<number>();
  readonly unit = input('%');

  protected readonly deltaPercent = computed(() => this.currentValue() - this.previousValue());
  protected readonly formattedDelta = computed(() => formatDeltaPercent(this.deltaPercent()));
  protected readonly isImprovement = computed(() => this.deltaPercent() >= 0);
}
