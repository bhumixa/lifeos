import { Injectable } from '@nestjs/common';
import { PlaceholderNotificationChannel } from './placeholder-notification.channel.js';

/** Placeholder adapter — see the class doc on PlaceholderNotificationChannel. Not named in the
 * PRD or docs/03-assumptions.md; included so the channel registry has a real seam for it if a
 * future milestone decides SMS reminders are worth adding, without changing this interface's
 * shape. No corresponding NotificationPreference flag exists yet (see the class doc on
 * NotificationDispatcherService), so nothing routes to this channel automatically today. */
@Injectable()
export class SmsChannel extends PlaceholderNotificationChannel {
  readonly type = 'SMS' as const;
  protected readonly displayName = 'SMS';
}
