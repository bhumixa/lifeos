import { Injectable } from '@nestjs/common';
import { PlaceholderNotificationChannel } from './placeholder-notification.channel.js';

/** Placeholder adapter — see the class doc on PlaceholderNotificationChannel. A future milestone
 * wires this to Web Push (VAPID) / FCM / APNs, per docs/08-tech-stack.md. */
@Injectable()
export class PushChannel extends PlaceholderNotificationChannel {
  readonly type = 'PUSH' as const;
  protected readonly displayName = 'Push';
}
