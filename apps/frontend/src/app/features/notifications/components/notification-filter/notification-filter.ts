import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import type { NotificationPriority, NotificationStatus, NotificationType } from '@lifeos/shared-types';
import { PRIORITY_LABELS, TYPE_LABELS } from '../../utils/notification-display';

export interface NotificationFilterChange {
  status?: NotificationStatus;
  type?: NotificationType;
  priority?: NotificationPriority;
}

const STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: 'Pending',
  QUEUED: 'Queued',
  SENT: 'Sent',
  FAILED: 'Failed',
  READ: 'Read',
  DISMISSED: 'Dismissed',
};

/** Filter controls for the Notification Center — same "emits one event per change, owns no query
 * state itself" shape GoalFilters/HabitFilterPanel already establish. */
@Component({
  selector: 'app-notification-filter',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './notification-filter.html',
  styleUrl: './notification-filter.scss',
})
export class NotificationFilter {
  protected readonly statuses = Object.entries(STATUS_LABELS) as [NotificationStatus, string][];
  protected readonly types = Object.entries(TYPE_LABELS) as [NotificationType, string][];
  protected readonly priorities = Object.entries(PRIORITY_LABELS) as [NotificationPriority, string][];

  protected status: NotificationStatus | '' = '';
  protected type: NotificationType | '' = '';
  protected priority: NotificationPriority | '' = '';

  readonly filterChanged = output<NotificationFilterChange>();
  readonly cleared = output<void>();

  protected onStatusChange(value: NotificationStatus | ''): void {
    this.status = value;
    this.filterChanged.emit({ status: value || undefined });
  }

  protected onTypeChange(value: NotificationType | ''): void {
    this.type = value;
    this.filterChanged.emit({ type: value || undefined });
  }

  protected onPriorityChange(value: NotificationPriority | ''): void {
    this.priority = value;
    this.filterChanged.emit({ priority: value || undefined });
  }

  protected clear(): void {
    this.status = '';
    this.type = '';
    this.priority = '';
    this.cleared.emit();
  }
}
