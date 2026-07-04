import { Module } from '@nestjs/common';
import { DesktopChannel } from './channels/desktop.channel.js';
import { EmailChannel } from './channels/email.channel.js';
import { InAppChannel } from './channels/in-app.channel.js';
import { NotificationChannelRegistry } from './channels/notification-channel.registry.js';
import { PushChannel } from './channels/push.channel.js';
import { SmsChannel } from './channels/sms.channel.js';
import { NotificationDispatcherService } from './notification-dispatcher.service.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationQueueService } from './notification-queue.service.js';
import { NotificationSchedulerService } from './notification-scheduler.service.js';
import { NotificationTemplateService } from './notification-template.service.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

/**
 * Imports no sibling feature module, the same "compose via events/raw reads, not DI" precedent
 * Journal/Calendar already set — NotificationSchedulerService subscribes to domain events emitted
 * by Tasks/Habits/Planner/Goals/Journal/Streaks via the globally-registered EventEmitter2 (see
 * app.module.ts), and its one raw cross-feature read (`scanUpcomingCalendarEvents`) queries
 * CalendarEvent directly through PrismaService rather than injecting CalendarService, matching
 * every other module's "raw Prisma read, not a whole sibling module, for one query" reasoning.
 * `NotificationsService`/`NotificationSchedulerService` are exported so a future milestone (e.g. a
 * `main.worker.ts` background process, or an AI Coach module wanting to surface a notification)
 * can reuse them without duplicating this module's create/enqueue logic.
 */
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationTemplateService,
    NotificationDispatcherService,
    NotificationQueueService,
    NotificationSchedulerService,
    NotificationChannelRegistry,
    InAppChannel,
    EmailChannel,
    PushChannel,
    SmsChannel,
    DesktopChannel,
  ],
  exports: [
    NotificationsService,
    NotificationSchedulerService,
    NotificationQueueService,
  ],
})
export class NotificationsModule {}
