import { Injectable } from '@nestjs/common';
import { DesktopChannel } from './desktop.channel.js';
import { EmailChannel } from './email.channel.js';
import { InAppChannel } from './in-app.channel.js';
import type {
  INotificationChannel,
  NotificationChannelType,
} from './notification-channel.interface.js';
import { PushChannel } from './push.channel.js';
import { SmsChannel } from './sms.channel.js';

/**
 * Maps a NotificationChannelType to the adapter that knows how to deliver on it — the single
 * place NotificationDispatcherService (and nothing else) needs to know every concrete channel
 * class exists. Adding a sixth channel later means adding one line here, not touching
 * NotificationDispatcherService's own resolution logic — the same data-driven-catalog goal
 * CalendarProviderRegistry already meets for Calendar's own providers.
 */
@Injectable()
export class NotificationChannelRegistry {
  private readonly channels: Record<
    NotificationChannelType,
    INotificationChannel
  >;

  constructor(
    inApp: InAppChannel,
    email: EmailChannel,
    push: PushChannel,
    sms: SmsChannel,
    desktop: DesktopChannel,
  ) {
    this.channels = {
      IN_APP: inApp,
      EMAIL: email,
      PUSH: push,
      SMS: sms,
      DESKTOP: desktop,
    };
  }

  resolve(type: NotificationChannelType): INotificationChannel {
    return this.channels[type];
  }
}
