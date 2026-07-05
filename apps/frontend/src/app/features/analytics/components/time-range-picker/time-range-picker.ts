import { Component, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import type { AnalyticsPeriod } from '@lifeos/shared-types';
import { periodLabel } from '../../utils/analytics-display';

const PERIODS: AnalyticsPeriod[] = ['DAY', 'WEEK', 'MONTH', 'YEAR'];

/** A four-way Day/Week/Month/Year toggle. Presentation-only — the hosting page decides what a
 * change means (most write it straight into AnalyticsPeriodStore), the same "controlled input,
 * emits, owns no state" shape CalendarFilters/GoalFilters already establish for their own pages. */
@Component({
  selector: 'app-time-range-picker',
  imports: [MatButtonToggleModule],
  templateUrl: './time-range-picker.html',
  styleUrl: './time-range-picker.scss',
})
export class TimeRangePicker {
  readonly value = input.required<AnalyticsPeriod>();
  readonly periodChange = output<AnalyticsPeriod>();

  protected readonly periods = PERIODS;
  protected readonly periodLabel = periodLabel;

  protected onChange(period: AnalyticsPeriod): void {
    this.periodChange.emit(period);
  }
}
