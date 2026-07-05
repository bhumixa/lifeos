import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { AnalyticsTimeSeriesPoint } from '@lifeos/shared-types';

const VIEWBOX_WIDTH = 300;
const VIEWBOX_HEIGHT = 100;
const PADDING = 8;

interface PlottedPoint {
  x: number;
  y: number;
  bucket: string;
  value: number;
}

/** Hand-rolled SVG line chart — no charting library exists anywhere in this codebase (the same
 * convention `GoalTimeline`/`JournalCalendar`/`MiniCalendar` already establish for their own
 * visuals). Renders `series` as a single polyline scaled into a fixed viewBox; `compact` drops
 * axis labels and padding for use as a Dashboard trend-card sparkline. */
@Component({
  selector: 'app-line-chart',
  imports: [MatTooltipModule],
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.scss',
})
export class LineChart {
  readonly series = input.required<AnalyticsTimeSeriesPoint[]>();
  readonly color = input('#4f46e5');
  readonly compact = input(false);

  protected readonly viewBox = `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`;

  protected readonly points = computed<PlottedPoint[]>(() => {
    const series = this.series();
    if (series.length === 0) {
      return [];
    }
    const values = series.map((point) => point.value);
    const min = Math.min(0, ...values);
    const max = Math.max(...values, 1);
    const span = max - min || 1;
    const usableWidth = VIEWBOX_WIDTH - PADDING * 2;
    const usableHeight = VIEWBOX_HEIGHT - PADDING * 2;
    const step = series.length === 1 ? 0 : usableWidth / (series.length - 1);

    return series.map((point, index) => ({
      x: PADDING + step * index,
      y: PADDING + usableHeight - ((point.value - min) / span) * usableHeight,
      bucket: point.bucket,
      value: point.value,
    }));
  });

  protected readonly path = computed(() =>
    this.points()
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' '),
  );

  protected readonly isEmpty = computed(() => this.series().length === 0);
}
