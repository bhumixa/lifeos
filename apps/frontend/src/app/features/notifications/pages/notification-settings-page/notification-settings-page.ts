import { Component, OnInit, inject } from '@angular/core';
import { NotificationPreferences } from '../../components/notification-preferences/notification-preferences';
import { NotificationsStore } from '../../state/notifications-store';

@Component({
  selector: 'app-notification-settings-page',
  imports: [NotificationPreferences],
  templateUrl: './notification-settings-page.html',
  styleUrl: './notification-settings-page.scss',
})
export class NotificationSettingsPage implements OnInit {
  protected readonly store = inject(NotificationsStore);

  ngOnInit(): void {
    this.store.loadPreferences();
  }
}
