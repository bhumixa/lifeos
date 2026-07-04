import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NotificationsStore } from '../../state/notifications-store';
import { NotificationBadge } from '../notification-badge/notification-badge';
import { NotificationList } from '../notification-list/notification-list';

/**
 * Lives in `features/notifications/` (not `shared/` or `layout/`) despite being mounted in the
 * app shell's Navbar — it needs live NotificationsStore state, the same "layout composes a
 * sibling feature's exported service/component directly" precedent the Dashboard's own
 * `DashboardCalendarService` already set for cross-feature composition, just applied to the shell
 * rather than another feature page. Replaces Navbar's previous static "No notifications yet."
 * placeholder menu.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, NotificationBadge, NotificationList],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBell implements OnInit {
  private readonly router = inject(Router);
  protected readonly store = inject(NotificationsStore);

  ngOnInit(): void {
    this.store.loadUnread();
  }

  protected viewAll(): void {
    void this.router.navigate(['/notifications']);
  }

  protected onRead(id: string): void {
    this.store.markRead(id).subscribe();
  }

  protected onDismiss(id: string): void {
    this.store.dismiss(id).subscribe();
  }
}
