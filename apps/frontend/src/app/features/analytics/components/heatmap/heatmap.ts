import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface HeatmapCell {
  /** "YYYY-MM-DD" */
  date: string;
  value: number;
}

/** Hand-rolled GitHub-contributions-style grid — Analytics' own copy of the "week-grid, 5-level
 * opacity" shape `habit-calendar-heatmap` already establishes, rebuilt fresh rather than importing
 * across the feature boundary (reaching into a sibling feature's `components/` folder would
 * violate docs/07-folder-structure.md's feature-isolation rule — cross-feature reuse only happens
 * via an exported *service*, the same precedent Calendar's own `DragDropEvent` already set).
 * Levels are computed relative to this chart's own max value, not a fixed habit-completion scale. */
@Component({
  selector: 'app-heatmap',
  imports: [MatTooltipModule],
  templateUrl: './heatmap.html',
  styleUrl: './heatmap.scss',
})
export class Heatmap {
  readonly cells = input.required<HeatmapCell[]>();
  readonly color = input('#4f46e5');

  private readonly maxValue = computed(() => Math.max(...this.cells().map((cell) => cell.value), 1));

  protected readonly weeks = computed(() => this.buildWeeks(this.cells()));

  protected opacityFor(value: number): number {
    if (value === 0) {
      return 0.12;
    }
    const ratio = value / this.maxValue();
    return Math.min(1, 0.35 + ratio * 0.65);
  }

  private buildWeeks(cells: HeatmapCell[]): (HeatmapCell | null)[][] {
    if (cells.length === 0) {
      return [];
    }
    // Monday-start offset so columns align to calendar weeks, not just chunks of 7.
    const leadingEmpty = (new Date(`${cells[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
    const padded: (HeatmapCell | null)[] = [...Array<null>(leadingEmpty).fill(null), ...cells];

    const weeks: (HeatmapCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }
    return weeks;
  }
}
