import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import type { Goal } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import {
  PRIORITY_LABELS,
  PRIORITY_VARIANTS,
  STATUS_LABELS,
  STATUS_VARIANTS,
  deadlineIndicator,
  progressLabel,
} from '../../utils/goal-display';
import { GoalProgressRing } from '../goal-progress-ring/goal-progress-ring';

@Component({
  selector: 'app-goal-card',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatMenuModule, Badge, GoalProgressRing],
  templateUrl: './goal-card.html',
  styleUrl: './goal-card.scss',
})
export class GoalCard {
  readonly goal = input.required<Goal>();

  readonly view = output<void>();
  readonly edit = output<void>();
  readonly delete = output<void>();
  readonly archive = output<void>();
  readonly unarchive = output<void>();

  protected readonly priorityLabel = computed(() => PRIORITY_LABELS[this.goal().priority]);
  protected readonly priorityVariant = computed(() => PRIORITY_VARIANTS[this.goal().priority]);
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.goal().status]);
  protected readonly statusVariant = computed(() => STATUS_VARIANTS[this.goal().status]);
  protected readonly deadline = computed(() => deadlineIndicator(this.goal()));
  protected readonly progressText = computed(() => progressLabel(this.goal()));
}
