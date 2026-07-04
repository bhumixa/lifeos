import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { Notification } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import {
  PRIORITY_LABELS,
  PRIORITY_VARIANTS,
  TYPE_ICONS,
  TYPE_LABELS,
  formatRelativeTime,
} from '../../utils/notification-display';

/** A single notification row — used by both NotificationList (Notification Center) and the
 * Navbar's NotificationBell preview menu, via the `compact` input for the smaller variant. */
@Component({
  selector: 'app-notification-card',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, Badge],
  templateUrl: './notification-card.html',
  styleUrl: './notification-card.scss',
})
export class NotificationCard {
  readonly notification = input.required<Notification>();
  readonly compact = input(false);

  readonly read = output<string>();
  readonly dismissed = output<string>();
  readonly removed = output<string>();

  protected readonly typeIcons = TYPE_ICONS;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly priorityVariants = PRIORITY_VARIANTS;

  protected get isUnread(): boolean {
    return !this.notification().readAt && this.notification().status !== 'DISMISSED';
  }

  protected relativeTime(): string {
    return formatRelativeTime(this.notification().createdAt);
  }
}
