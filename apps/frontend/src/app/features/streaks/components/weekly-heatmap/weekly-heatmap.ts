import { Component, computed, input } from '@angular/core';
import type { DailyHistoryEntry } from '@lifeos/shared-types';
import { HabitCalendarHeatmap } from '../../../habits/components/habit-calendar-heatmap/habit-calendar-heatmap';
import { toHeatmapCells } from '../../utils/streak-display';

const WEEKS_SHOWN = 8;
const DAYS_SHOWN = WEEKS_SHOWN * 7;

/** Recent-activity view of the day-level consistency history — reuses the same
 * GitHub-contributions-style grid features/habits/components/habit-calendar-heatmap already
 * renders for a single habit's logs, windowed to the trailing 8 weeks. */
@Component({
  selector: 'app-weekly-heatmap',
  imports: [HabitCalendarHeatmap],
  templateUrl: './weekly-heatmap.html',
  styleUrl: './weekly-heatmap.scss',
})
export class WeeklyHeatmap {
  readonly history = input.required<DailyHistoryEntry[]>();
  readonly color = input('#5c6bc0');

  protected readonly cells = computed(() => toHeatmapCells(this.history().slice(-DAYS_SHOWN)));
}
