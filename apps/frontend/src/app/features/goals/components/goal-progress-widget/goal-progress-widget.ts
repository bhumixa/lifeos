import { Component, computed, input, output } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { Goal } from '@lifeos/shared-types';
import { progressLabel } from '../../utils/goal-display';

/** Compact linear-progress row for a single goal — the "Success Meter" style linear-percent
 * pattern Streaks/Planner already establish (`mat-progress-bar`, not a hand-rolled bar), used by
 * the Goals Dashboard's "at a glance" list and reusable by the main app Dashboard's own Goal
 * Progress widget (see features/dashboard's dashboard-goals.service.ts). */
@Component({
  selector: 'app-goal-progress-widget',
  imports: [MatProgressBarModule],
  templateUrl: './goal-progress-widget.html',
  styleUrl: './goal-progress-widget.scss',
})
export class GoalProgressWidget {
  readonly goal = input.required<Goal>();

  readonly view = output<void>();

  protected readonly progressText = computed(() => progressLabel(this.goal()));
}
