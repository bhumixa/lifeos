import { Component, computed, input, output } from '@angular/core';
import type { Notification } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { timelineGroup } from '../../utils/notification-display';
import { NotificationList } from '../notification-list/notification-list';

const GROUP_ORDER = ['Today', 'Yesterday', 'Earlier'] as const;

interface TimelineGroup {
  label: (typeof GROUP_ORDER)[number];
  notifications: Notification[];
}

/** Groups notifications by Today/Yesterday/Earlier — a hand-rolled grouped list, matching this
 * codebase's "no charting/timeline library" convention (the same one Goals' GoalTimeline and
 * Journal's JournalCalendar already established) — not a linear/visual timeline widget. */
@Component({
  selector: 'app-notification-timeline',
  imports: [NotificationList, EmptyState, Skeleton],
  templateUrl: './notification-timeline.html',
  styleUrl: './notification-timeline.scss',
})
export class NotificationTimeline {
  readonly notifications = input.required<Notification[]>();
  readonly loading = input(false);

  readonly read = output<string>();
  readonly dismissed = output<string>();
  readonly removed = output<string>();

  protected readonly groups = computed<TimelineGroup[]>(() => {
    const buckets = new Map<TimelineGroup['label'], Notification[]>();
    for (const notification of this.notifications()) {
      const label = timelineGroup(notification.createdAt);
      buckets.set(label, [...(buckets.get(label) ?? []), notification]);
    }
    return GROUP_ORDER.filter((label) => buckets.has(label)).map((label) => ({
      label,
      notifications: buckets.get(label)!,
    }));
  });
}
