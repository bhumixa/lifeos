import { Component, input } from '@angular/core';
import { HabitProgressRing } from '../../../habits/components/habit-progress-ring/habit-progress-ring';

/** Goal progress %, rendered via the same domain-agnostic ring features/habits/components/
 * habit-progress-ring already establishes — the same wrapper precedent
 * features/streaks/components/consistency-ring set for the Streak Engine's own percentage. */
@Component({
  selector: 'app-goal-progress-ring',
  imports: [HabitProgressRing],
  templateUrl: './goal-progress-ring.html',
  styleUrl: './goal-progress-ring.scss',
})
export class GoalProgressRing {
  readonly percent = input.required<number>();
  readonly size = input(56);
  readonly color = input('#3F51B5');
}
