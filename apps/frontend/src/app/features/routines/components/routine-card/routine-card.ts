import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { Routine } from '@lifeos/shared-types';
import { formatDuration } from '../../utils/routine-display';

@Component({
  selector: 'app-routine-card',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatMenuModule, MatSlideToggleModule, MatTooltipModule],
  templateUrl: './routine-card.html',
  styleUrl: './routine-card.scss',
})
export class RoutineCard {
  readonly routine = input.required<Routine>();

  readonly view = output<void>();
  readonly edit = output<void>();
  readonly duplicate = output<void>();
  readonly delete = output<void>();
  readonly toggleActive = output<void>();

  protected readonly stepCountLabel = computed(() => {
    const count = this.routine().steps.length;
    return count === 1 ? '1 step' : `${count} steps`;
  });

  protected readonly durationLabel = computed(() => formatDuration(this.routine().totalDurationMinutes));
}
