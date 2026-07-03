import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { Habit } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import { FREQUENCY_LABELS, FREQUENCY_VARIANTS, periodLabel, reminderIndicator } from '../../utils/habit-display';
import { HabitCompletionButton } from '../habit-completion-button/habit-completion-button';
import { HabitProgressRing } from '../habit-progress-ring/habit-progress-ring';

@Component({
  selector: 'app-habit-card',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
    Badge,
    HabitCompletionButton,
    HabitProgressRing,
  ],
  templateUrl: './habit-card.html',
  styleUrl: './habit-card.scss',
})
export class HabitCard {
  readonly habit = input.required<Habit>();

  readonly view = output<void>();
  readonly edit = output<void>();
  readonly delete = output<void>();
  readonly toggleActive = output<void>();
  readonly complete = output<void>();
  readonly undo = output<void>();

  protected readonly frequencyLabel = computed(() => FREQUENCY_LABELS[this.habit().targetFrequency]);
  protected readonly frequencyVariant = computed(() => FREQUENCY_VARIANTS[this.habit().targetFrequency]);
  protected readonly periodLabel = computed(() => periodLabel(this.habit().targetFrequency));
  protected readonly reminder = computed(() => reminderIndicator(this.habit()));
}
