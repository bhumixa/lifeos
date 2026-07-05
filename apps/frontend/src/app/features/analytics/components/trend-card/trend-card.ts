import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { AnalyticsTimeSeriesPoint } from '@lifeos/shared-types';
import { LineChart } from '../line-chart/line-chart';
import { formatDeltaPercent } from '../../utils/analytics-display';

/** A label/value pair with a compact sparkline underneath — the shape both the Analytics
 * Dashboard's per-domain quick-look cards and the main app Dashboard's four trend widgets
 * (Weekly Productivity/Focus Trend/Habit Trend/Mood Trend) share. */
@Component({
  selector: 'app-trend-card',
  imports: [MatCardModule, MatIconModule, LineChart],
  templateUrl: './trend-card.html',
  styleUrl: './trend-card.scss',
})
export class TrendCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input.required<string>();
  readonly series = input.required<AnalyticsTimeSeriesPoint[]>();
  readonly color = input('#4f46e5');
  readonly deltaPercent = input<number>();

  protected readonly formatDeltaPercent = formatDeltaPercent;
}
