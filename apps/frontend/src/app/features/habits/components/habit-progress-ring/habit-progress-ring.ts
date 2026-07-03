import { Component, computed, input } from '@angular/core';

/** Domain-agnostic circular progress indicator — takes a percent and a color, knows nothing
 * about habits specifically, same "presentational only" spirit as shared/components/badge. */
@Component({
  selector: 'app-habit-progress-ring',
  templateUrl: './habit-progress-ring.html',
  styleUrl: './habit-progress-ring.scss',
})
export class HabitProgressRing {
  readonly percent = input.required<number>();
  readonly size = input(56);
  readonly color = input('#4CAF50');

  protected readonly radius = computed(() => this.size() / 2 - 4);
  protected readonly center = computed(() => this.size() / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly dashOffset = computed(() => {
    const clamped = Math.min(100, Math.max(0, this.percent()));
    return this.circumference() * (1 - clamped / 100);
  });
}
