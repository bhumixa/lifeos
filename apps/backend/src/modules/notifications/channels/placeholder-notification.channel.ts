import type {
  ChannelDeliveryResult,
  INotificationChannel,
  NotificationChannelType,
} from './notification-channel.interface.js';

/**
 * Shared placeholder behavior for every not-yet-implemented channel. This milestone's instructions
 * are explicit — "Do NOT implement external push providers. Do NOT implement email providers.
 * Build the architecture only." — so EmailChannel/PushChannel/SmsChannel/DesktopChannel all extend
 * this rather than each hand-writing the same "not implemented" result (CLAUDE.md's "never
 * duplicate logic" rule), the exact same shape RemoteCalendarProvider already established for
 * Calendar's own non-LOCAL providers. A future milestone that wires up a real provider for one of
 * these deletes that one subclass's inheritance from this base and gives it a real `send` body —
 * the other three stay untouched.
 */
export abstract class PlaceholderNotificationChannel implements INotificationChannel {
  abstract readonly type: NotificationChannelType;
  protected abstract readonly displayName: string;

  send(): Promise<ChannelDeliveryResult> {
    return Promise.resolve({
      channel: this.type,
      success: false,
      error: `NOT_IMPLEMENTED: ${this.displayName} delivery is not yet implemented — a future milestone integrates a real provider.`,
    });
  }
}
