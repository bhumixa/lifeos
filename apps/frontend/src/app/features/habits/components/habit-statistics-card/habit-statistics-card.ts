import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import type { Habit } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import { FREQUENCY_LABELS, FREQUENCY_VARIANTS, periodLabel } from '../../utils/habit-display';
import { HabitProgressRing } from '../habit-progress-ring/habit-progress-ring';

/**
 * Habit Detail page's stats panel. Deliberately limited to current-period progress and a
 * logged-days rate over the fetched history window — no streak math here (Milestone 6 explicitly
 * defers streak calculations to the Streak Engine), so nothing on this card claims to count
 * consecutive days.
 */
@Component({
  selector: 'app-habit-statistics-card',
  imports: [MatCardModule, Badge, HabitProgressRing],
  templateUrl: './habit-statistics-card.html',
  styleUrl: './habit-statistics-card.scss',
})
export class HabitStatisticsCard {
  readonly habit = input.required<Habit>();
  /** How many days in `windowDays` had at least one log — from the Habit History fetch. */
  readonly loggedDays = input(0);
  readonly windowDays = input(30);

  protected readonly frequencyLabel = computed(() => FREQUENCY_LABELS[this.habit().targetFrequency]);
  protected readonly frequencyVariant = computed(() => FREQUENCY_VARIANTS[this.habit().targetFrequency]);
  protected readonly periodLabel = computed(() => periodLabel(this.habit().targetFrequency));
  protected readonly loggedRate = computed(() =>
    this.windowDays() === 0 ? 0 : Math.round((this.loggedDays() / this.windowDays()) * 100),
  );
}
