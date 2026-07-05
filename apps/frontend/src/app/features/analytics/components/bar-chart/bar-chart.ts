import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { AnalyticsTimeSeriesPoint } from '@lifeos/shared-types';

interface BarPoint {
  bucket: string;
  value: number;
  heightPercent: number;
}

/** Hand-rolled CSS bar chart (flexbox columns, no SVG needed) — the same "no charting library"
 * convention `LineChart`/`GoalTimeline` already establish. Bars scale to the tallest value in
 * `series`; a value of 0 still renders a thin visible sliver rather than disappearing entirely. */
@Component({
  selector: 'app-bar-chart',
  imports: [MatTooltipModule],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
})
export class BarChart {
  readonly series = input.required<AnalyticsTimeSeriesPoint[]>();
  readonly color = input('#4f46e5');

  protected readonly bars = computed<BarPoint[]>(() => {
    const series = this.series();
    const max = Math.max(...series.map((point) => point.value), 1);
    return series.map((point) => ({
      bucket: point.bucket,
      value: point.value,
      heightPercent: Math.max(2, Math.round((point.value / max) * 100)),
    }));
  });

  protected readonly isEmpty = computed(() => this.series().length === 0);
}
