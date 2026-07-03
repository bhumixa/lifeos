import { Component, computed, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { consistencyLabel } from '../../utils/streak-display';

/** Linear success-rate readout — reuses Angular Material's own progress bar (Routine Summary and
 * the Planner Dashboard already establish `mat-progress-bar` as this codebase's "percent complete"
 * bar) rather than a bespoke meter element. */
@Component({
  selector: 'app-success-meter',
  imports: [MatProgressBarModule],
  templateUrl: './success-meter.html',
  styleUrl: './success-meter.scss',
})
export class SuccessMeter {
  readonly percent = input.required<number>();

  protected readonly label = computed(() => consistencyLabel(this.percent()));
}
