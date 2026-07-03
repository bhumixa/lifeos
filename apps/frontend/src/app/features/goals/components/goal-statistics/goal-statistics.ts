import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import type { Goal } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import { PRIORITY_LABELS, PRIORITY_VARIANTS, STATUS_LABELS, STATUS_VARIANTS, TARGET_TYPE_LABELS } from '../../utils/goal-display';
import { GoalProgressRing } from '../goal-progress-ring/goal-progress-ring';

/** Goal Detail page's stats panel — mirrors HabitStatisticsCard's role for the habits feature:
 * progress ring plus the numbers behind it, no calculations of its own beyond what's already on
 * the Goal response. */
@Component({
  selector: 'app-goal-statistics',
  imports: [MatCardModule, Badge, GoalProgressRing],
  templateUrl: './goal-statistics.html',
  styleUrl: './goal-statistics.scss',
})
export class GoalStatistics {
  readonly goal = input.required<Goal>();

  protected readonly priorityLabel = computed(() => PRIORITY_LABELS[this.goal().priority]);
  protected readonly priorityVariant = computed(() => PRIORITY_VARIANTS[this.goal().priority]);
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.goal().status]);
  protected readonly statusVariant = computed(() => STATUS_VARIANTS[this.goal().status]);
  protected readonly targetTypeLabel = computed(() => TARGET_TYPE_LABELS[this.goal().targetType]);
}
