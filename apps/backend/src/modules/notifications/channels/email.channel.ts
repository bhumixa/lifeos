import { Injectable } from '@nestjs/common';
import { PlaceholderNotificationChannel } from './placeholder-notification.channel.js';

/** Placeholder adapter — see the class doc on PlaceholderNotificationChannel. A future milestone
 * wires this to a transactional email provider (Resend/Postmark, per docs/08-tech-stack.md). */
@Injectable()
export class EmailChannel extends PlaceholderNotificationChannel {
  readonly type = 'EMAIL' as const;
  protected readonly displayName = 'Email';
}
