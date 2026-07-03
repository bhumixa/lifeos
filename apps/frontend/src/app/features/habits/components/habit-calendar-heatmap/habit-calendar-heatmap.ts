import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { HeatmapCell, HeatmapLevel } from '../../utils/habit-display';

const LEVEL_OPACITY: Record<HeatmapLevel, number> = { 0: 0.12, 1: 0.35, 2: 0.55, 3: 0.75, 4: 1 };

/** GitHub-contributions-style grid — one column per week, Monday at the top. Takes pre-built
 * cells (see utils/habit-display.buildHeatmapCells) rather than raw logs, so this stays a pure
 * rendering component with no date-math of its own beyond week-alignment padding. */
@Component({
  selector: 'app-habit-calendar-heatmap',
  imports: [MatTooltipModule],
  templateUrl: './habit-calendar-heatmap.html',
  styleUrl: './habit-calendar-heatmap.scss',
})
export class HabitCalendarHeatmap {
  readonly cells = input.required<HeatmapCell[]>();
  readonly color = input('#4CAF50');

  protected readonly weeks = computed(() => this.buildWeeks(this.cells()));

  protected opacityFor(level: HeatmapLevel): number {
    return LEVEL_OPACITY[level];
  }

  private buildWeeks(cells: HeatmapCell[]): (HeatmapCell | null)[][] {
    if (cells.length === 0) {
      return [];
    }

    // Monday-start offset so columns align to calendar weeks, not just chunks of 7.
    const leadingEmpty = (new Date(cells[0].date).getUTCDay() + 6) % 7;
    const padded: (HeatmapCell | null)[] = [...Array<null>(leadingEmpty).fill(null), ...cells];

    const weeks: (HeatmapCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }
    return weeks;
  }
}
