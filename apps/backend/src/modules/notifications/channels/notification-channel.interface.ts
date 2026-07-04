import type { Notification } from '../../../../generated/prisma/index.js';

/** Which delivery mechanism a channel implements. Not a Prisma enum — unlike NotificationType/
 * Priority/Status, no column stores this; it only ever exists as an in-memory routing key (see
 * NotificationChannelRegistry), the same reason CalendarProvider's own registry key needed a real
 * enum (it IS a stored column) while this one doesn't. */
export type NotificationChannelType =
  'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS' | 'DESKTOP';

/** What NotificationDispatcherService persists per attempted channel — mirrors
 * CalendarSyncResult's shape (`status`/`errorMessage`) for the same "explicit, documented outcome,
 * never a thrown exception or a silent no-op" reason given there. */
export interface ChannelDeliveryResult {
  channel: NotificationChannelType;
  success: boolean;
  error?: string;
}

/**
 * The seam every delivery mechanism implements — NotificationDispatcherService depends only on
 * this interface, never on a concrete channel, the same "data-driven, not hardcoded-in-the-
 * dispatcher" goal ICalendarProvider already meets for Calendar's own providers (see
 * modules/calendar/providers/calendar-provider.interface.ts). `send` is deliberately the only
 * method — a real push/email/SMS/desktop integration would eventually need more (templates,
 * provider-specific payloads, delivery receipts), but per this milestone's own instructions ("Do
 * not implement external push providers. Do not implement email providers. Build the architecture
 * only."), `send` is the one operation NotificationDispatcherService actually calls today.
 */
export interface INotificationChannel {
  readonly type: NotificationChannelType;
  send(notification: Notification): Promise<ChannelDeliveryResult>;
}
