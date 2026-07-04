import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { NotificationFilterChange } from '../../components/notification-filter/notification-filter';
import { NotificationFilter } from '../../components/notification-filter/notification-filter';
import { NotificationTimeline } from '../../components/notification-timeline/notification-timeline';
import { UnreadCounter } from '../../components/unread-counter/unread-counter';
import { NotificationsStore } from '../../state/notifications-store';

@Component({
  selector: 'app-notification-center-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, NotificationFilter, NotificationTimeline, UnreadCounter],
  templateUrl: './notification-center-page.html',
  styleUrl: './notification-center-page.scss',
})
export class NotificationCenterPage implements OnInit {
  protected readonly store = inject(NotificationsStore);

  ngOnInit(): void {
    this.store.load();
    this.store.loadUnread();
  }

  protected onFilterChanged(change: NotificationFilterChange): void {
    this.store.setQuery(change);
  }

  protected onFilterCleared(): void {
    this.store.resetFilters();
  }

  protected markAllRead(): void {
    this.store.markAllRead().subscribe();
  }

  protected onRead(id: string): void {
    this.store.markRead(id).subscribe();
  }

  protected onDismiss(id: string): void {
    this.store.dismiss(id).subscribe();
  }

  protected onRemove(id: string): void {
    this.store.remove(id).subscribe();
  }
}
