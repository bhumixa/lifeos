import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CurrentStreak } from '../current-streak/current-streak';
import { LongestStreak } from '../longest-streak/longest-streak';

/** Streak Dashboard's headline card — pairs CurrentStreak/LongestStreak the same way
 * habit-statistics-card pairs a progress ring with its own stat labels. */
@Component({
  selector: 'app-streak-card',
  imports: [MatCardModule, CurrentStreak, LongestStreak],
  templateUrl: './streak-card.html',
  styleUrl: './streak-card.scss',
})
export class StreakCard {
  readonly currentStreak = input.required<number>();
  readonly longestStreak = input.required<number>();
  /** False when the user has no active daily habits yet — see StreaksOverview.hasDailyHabits. */
  readonly hasDailyHabits = input(true);
}
