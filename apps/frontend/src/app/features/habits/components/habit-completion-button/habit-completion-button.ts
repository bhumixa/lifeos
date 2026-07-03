import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/** One-tap quick-complete control, reused by the Today's Habits page, the Habit Card menu-free
 * body, and the Dashboard's Quick Complete panel — knows nothing about how the tap is persisted,
 * it only emits `complete`/`undo` and lets the caller decide (see HabitsStore.quickComplete). */
@Component({
  selector: 'app-habit-completion-button',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './habit-completion-button.html',
  styleUrl: './habit-completion-button.scss',
})
export class HabitCompletionButton {
  readonly completedToday = input.required<boolean>();
  readonly todayCount = input(0);
  readonly targetCount = input(1);

  readonly complete = output<void>();
  readonly undo = output<void>();
}
