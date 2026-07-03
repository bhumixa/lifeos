import { Component, input } from '@angular/core';
import { HabitProgressRing } from '../../../habits/components/habit-progress-ring/habit-progress-ring';

/** Weekly/Monthly consistency %, rendered via the same domain-agnostic ring
 * features/habits/components/habit-progress-ring already establishes — the Streak Engine's
 * "percent complete" concept is the same shape, just a different percentage source. */
@Component({
  selector: 'app-consistency-ring',
  imports: [HabitProgressRing],
  templateUrl: './consistency-ring.html',
  styleUrl: './consistency-ring.scss',
})
export class ConsistencyRing {
  readonly percent = input.required<number>();
  readonly label = input.required<string>();
  readonly size = input(72);
  readonly color = input('#5c6bc0');
}
