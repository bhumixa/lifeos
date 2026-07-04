import { Component, input, output } from '@angular/core';
import type { Notification } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { NotificationCard } from '../notification-card/notification-card';

/** A plain list of NotificationCards with loading/empty states — the reusable rendering
 * primitive both the Notification Center page and NotificationTimeline's per-group sections
 * compose, so list rendering/loading/empty behavior is written once. */
@Component({
  selector: 'app-notification-list',
  imports: [NotificationCard, EmptyState, Skeleton],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
})
export class NotificationList {
  readonly notifications = input.required<Notification[]>();
  readonly loading = input(false);
  readonly compact = input(false);

  readonly read = output<string>();
  readonly dismissed = output<string>();
  readonly removed = output<string>();
}
