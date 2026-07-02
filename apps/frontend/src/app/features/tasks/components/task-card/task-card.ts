import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import type { Task } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import {
  PRIORITY_LABELS,
  PRIORITY_VARIANTS,
  STATUS_LABELS,
  STATUS_VARIANTS,
  dueDateIndicator,
} from '../../utils/task-display';

@Component({
  selector: 'app-task-card',
  imports: [MatButtonModule, MatCardModule, MatCheckboxModule, MatIconModule, MatMenuModule, Badge],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCard {
  readonly task = input.required<Task>();

  readonly view = output<void>();
  readonly edit = output<void>();
  readonly delete = output<void>();
  readonly toggleComplete = output<void>();

  protected readonly priorityLabel = computed(() => PRIORITY_LABELS[this.task().priority]);
  protected readonly priorityVariant = computed(() => PRIORITY_VARIANTS[this.task().priority]);
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.task().status]);
  protected readonly statusVariant = computed(() => STATUS_VARIANTS[this.task().status]);
  protected readonly dueIndicator = computed(() => dueDateIndicator(this.task()));
  protected readonly isCompleted = computed(() => this.task().status === 'COMPLETED');
}
