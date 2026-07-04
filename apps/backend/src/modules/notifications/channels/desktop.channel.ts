import { Injectable } from '@nestjs/common';
import { PlaceholderNotificationChannel } from './placeholder-notification.channel.js';

/** Placeholder adapter — see the class doc on PlaceholderNotificationChannel. A future desktop/PWA
 * background-sync milestone would wire this to the Notifications Web API. No corresponding
 * NotificationPreference flag exists yet (see the class doc on NotificationDispatcherService), so
 * nothing routes to this channel automatically today. */
@Injectable()
export class DesktopChannel extends PlaceholderNotificationChannel {
  readonly type = 'DESKTOP' as const;
  protected readonly displayName = 'Desktop';
}
