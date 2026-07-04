import { Injectable } from '@nestjs/common';
import type {
  Notification,
  NotificationPreference,
} from '../../../generated/prisma/index.js';
import type {
  ChannelDeliveryResult,
  NotificationChannelType,
} from './channels/notification-channel.interface.js';
import { NotificationChannelRegistry } from './channels/notification-channel.registry.js';

/**
 * Resolves which channels a Notification should attempt, based on the user's own
 * NotificationPreference, and dispatches to each via NotificationChannelRegistry. IN_APP is always
 * attempted regardless of preference — it's the one channel that actually delivers something
 * (the Notification row itself, see the class doc on InAppChannel), and Notification Center has no
 * separate "in-app enabled" concept to opt out of; `enableInApp` still exists on the preference
 * schema (per the milestone's literal field list) and is honored as a real, if currently
 * redundant, toggle. EMAIL/PUSH are attempted only when their own preference flag is on — both
 * currently resolve to a placeholder channel that always reports NOT_IMPLEMENTED (see
 * PlaceholderNotificationChannel), so enabling them today has no visible effect beyond recording
 * that attempt's result. SMS/DESKTOP have no corresponding preference flag in this milestone's
 * literal NotificationPreference field list, so nothing routes to them yet — they exist in
 * NotificationChannelRegistry purely as an extensibility seam (see its class doc).
 *
 * A Notification counts as successfully delivered if *any* attempted channel succeeds — in
 * practice that's always IN_APP, since IN_APP is always attempted and always succeeds. Every
 * channel's own result is still returned so NotificationQueueService can log a placeholder
 * channel's NOT_IMPLEMENTED reason without treating it as the delivery failure that blocks
 * marking the Notification SENT.
 */
@Injectable()
export class NotificationDispatcherService {
  constructor(private readonly registry: NotificationChannelRegistry) {}

  resolveChannels(
    preference: NotificationPreference,
  ): NotificationChannelType[] {
    const channels: NotificationChannelType[] = ['IN_APP'];
    if (preference.enableEmail) {
      channels.push('EMAIL');
    }
    if (preference.enablePush) {
      channels.push('PUSH');
    }
    return channels;
  }

  async dispatch(
    notification: Notification,
    preference: NotificationPreference,
  ): Promise<{ success: boolean; results: ChannelDeliveryResult[] }> {
    const channelTypes = this.resolveChannels(preference);
    const results = await Promise.all(
      channelTypes.map((type) =>
        this.registry.resolve(type).send(notification),
      ),
    );
    return { success: results.some((result) => result.success), results };
  }
}
