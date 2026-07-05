import { Component, computed, input } from '@angular/core';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface LegendEntry extends PieSlice {
  percent: number;
}

/** Hand-rolled donut chart via a CSS `conic-gradient` — no charting library exists anywhere in
 * this codebase. Takes pre-colored slices (the caller decides the palette) rather than raw
 * category data, keeping this a pure rendering component. */
@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.html',
  styleUrl: './pie-chart.scss',
})
export class PieChart {
  readonly slices = input.required<PieSlice[]>();

  protected readonly total = computed(() => this.slices().reduce((sum, slice) => sum + slice.value, 0));

  protected readonly legend = computed<LegendEntry[]>(() => {
    const total = this.total();
    return this.slices().map((slice) => ({
      ...slice,
      percent: total === 0 ? 0 : Math.round((slice.value / total) * 100),
    }));
  });

  protected readonly gradient = computed(() => {
    const total = this.total();
    if (total === 0) {
      return 'conic-gradient(var(--mat-sys-surface-variant, #e0e0e0) 0deg 360deg)';
    }
    let cursor = 0;
    const stops = this.slices().map((slice) => {
      const start = cursor;
      cursor += (slice.value / total) * 360;
      return `${slice.color} ${start}deg ${cursor}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });
}
