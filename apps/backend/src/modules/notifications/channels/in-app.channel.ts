import { Injectable } from '@nestjs/common';
import type {
  ChannelDeliveryResult,
  INotificationChannel,
} from './notification-channel.interface.js';

/**
 * The only channel that actually does something today. A Notification row already IS the in-app
 * representation — there's nothing external to push, so "delivering" in-app just means the row
 * exists and is queryable via GET /notifications — the same "nothing external to reconcile,
 * succeeds immediately" reasoning LocalCalendarProvider.sync uses for a LOCAL calendar.
 */
@Injectable()
export class InAppChannel implements INotificationChannel {
  readonly type = 'IN_APP' as const;

  send(): Promise<ChannelDeliveryResult> {
    return Promise.resolve({ channel: this.type, success: true });
  }
}
