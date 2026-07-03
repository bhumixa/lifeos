import { Component, computed, input } from '@angular/core';
import type { DailyHistoryEntry } from '@lifeos/shared-types';
import { HabitCalendarHeatmap } from '../../../habits/components/habit-calendar-heatmap/habit-calendar-heatmap';
import { toHeatmapCells } from '../../utils/streak-display';

const DAYS_SHOWN = 90;

/** Longer-range view of the same day-level consistency history WeeklyHeatmap shows, windowed to
 * the trailing ~13 weeks instead of 8 — same underlying grid component, different data slice. */
@Component({
  selector: 'app-monthly-heatmap',
  imports: [HabitCalendarHeatmap],
  templateUrl: './monthly-heatmap.html',
  styleUrl: './monthly-heatmap.scss',
})
export class MonthlyHeatmap {
  readonly history = input.required<DailyHistoryEntry[]>();
  readonly color = input('#5c6bc0');

  protected readonly cells = computed(() => toHeatmapCells(this.history().slice(-DAYS_SHOWN)));
}
