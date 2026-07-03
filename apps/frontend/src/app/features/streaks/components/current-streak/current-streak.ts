import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Domain-agnostic "N day streak" readout — knows nothing about habits/streaks logic itself,
 * same "presentational only" spirit as shared/components/stat-card. */
@Component({
  selector: 'app-current-streak',
  imports: [MatIconModule],
  templateUrl: './current-streak.html',
  styleUrl: './current-streak.scss',
})
export class CurrentStreak {
  readonly days = input.required<number>();
}
