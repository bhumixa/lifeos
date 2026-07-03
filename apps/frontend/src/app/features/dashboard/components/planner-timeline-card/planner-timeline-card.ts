import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerBlock } from '@lifeos/shared-types';
import { blockColor, formatTimeOfDay, TYPE_ICONS } from '../../../planner/utils/planner-display';

/** Compact "Today's Timeline" widget — the day's blocks in chronological order plus a short
 * "upcoming" callout, with a link into the full Day View for anything more than a glance. */
@Component({
  selector: 'app-planner-timeline-card',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './planner-timeline-card.html',
  styleUrl: './planner-timeline-card.scss',
})
export class PlannerTimelineCard {
  readonly blocks = input<PlannerBlock[]>([]);
  readonly loading = input(false);

  protected readonly sortedBlocks = computed(() =>
    [...this.blocks()].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  );

  protected readonly typeIcons = TYPE_ICONS;
  protected readonly blockColor = blockColor;
  protected readonly formatTimeOfDay = formatTimeOfDay;
}
