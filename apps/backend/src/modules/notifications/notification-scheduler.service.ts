import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  NotificationPriority,
  NotificationType,
} from '../../../generated/prisma/index.js';
import {
  AchievementUnlockedEvent,
  CalendarEventStartingEvent,
  GoalCompletedEvent,
  HabitCompletedEvent,
  JournalCreatedEvent,
  NOTIFICATION_EVENTS,
  PlannerBlockCompletedEvent,
  TaskCompletedEvent,
} from '../../events/index.js';
import { computeScheduledFor } from './utils/quiet-hours.util.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationQueueService } from './notification-queue.service.js';
import { NotificationTemplateService } from './notification-template.service.js';
import { NotificationsService } from './notifications.service.js';

/**
 * The one place domain events (see events/*.event.ts) turn into Notification rows. Subscribes via
 * `@OnEvent` rather than being called directly by Tasks/Habits/Planner/Goals/Journal/Streaks — see
 * docs/05-architecture.md's Milestone 12 note for why this is the first real use of the
 * EventEmitter2 seam every prior milestone since Planner (Milestone 7) anticipated but left
 * uninstalled. Every handler follows the same three-step contract: (1) skip entirely if the user
 * has this NotificationType's category disabled (NotificationPreferencesService.isCategoryEnabled)
 * — per this milestone's "respect notification preferences" rule, a disabled category never even
 * creates a row; (2) compute `scheduledFor`, pushed past quiet hours if currently inside the user's
 * configured window (per "respect quiet hours"); (3) create the Notification and enqueue it for
 * delivery — never deliver synchronously inside the handler itself, the same "do not deliver
 * notifications immediately inside controllers" business rule applied to event handlers too.
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly preferences: NotificationPreferencesService,
    private readonly templates: NotificationTemplateService,
    private readonly queue: NotificationQueueService,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.TASK_COMPLETED)
  async handleTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    const template = this.templates.buildTaskCompleted(event.title);
    await this.createAndEnqueue(event.userId, NotificationType.TASK, template, {
      taskId: event.taskId,
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.HABIT_COMPLETED)
  async handleHabitCompleted(event: HabitCompletedEvent): Promise<void> {
    const template = this.templates.buildHabitCompleted(
      event.habitName,
      event.date,
    );
    await this.createAndEnqueue(
      event.userId,
      NotificationType.HABIT,
      template,
      {
        habitId: event.habitId,
        date: event.date,
      },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.PLANNER_BLOCK_COMPLETED)
  async handlePlannerBlockCompleted(
    event: PlannerBlockCompletedEvent,
  ): Promise<void> {
    const template = this.templates.buildPlannerBlockCompleted(event.title);
    await this.createAndEnqueue(
      event.userId,
      NotificationType.PLANNER,
      template,
      {
        blockId: event.blockId,
      },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.GOAL_COMPLETED)
  async handleGoalCompleted(event: GoalCompletedEvent): Promise<void> {
    const template = this.templates.buildGoalCompleted(event.title);
    await this.createAndEnqueue(event.userId, NotificationType.GOAL, template, {
      goalId: event.goalId,
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.JOURNAL_CREATED)
  async handleJournalCreated(event: JournalCreatedEvent): Promise<void> {
    const template = this.templates.buildJournalCreated(event.type);
    await this.createAndEnqueue(
      event.userId,
      NotificationType.JOURNAL,
      template,
      {
        journalId: event.journalId,
      },
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED)
  async handleAchievementUnlocked(
    event: AchievementUnlockedEvent,
  ): Promise<void> {
    const template = this.templates.buildAchievementUnlocked(
      event.title,
      event.xpReward,
    );
    await this.createAndEnqueue(
      event.userId,
      NotificationType.ACHIEVEMENT,
      template,
      {
        achievementId: event.achievementId,
      },
    );
  }

  /** See the class doc on events/calendar-event-starting.event.ts — this listener is real and
   * unit-tested, but CalendarEventStartingEvent is never emitted anywhere yet, so it never fires
   * in practice until a future background worker calls `scanUpcomingCalendarEvents` below. */
  @OnEvent(NOTIFICATION_EVENTS.CALENDAR_EVENT_STARTING)
  async handleCalendarEventStarting(
    event: CalendarEventStartingEvent,
  ): Promise<void> {
    const template = this.templates.buildCalendarEventStarting(event.title);
    await this.createAndEnqueue(
      event.userId,
      NotificationType.CALENDAR,
      template,
      {
        calendarEventId: event.calendarEventId,
      },
    );
  }

  /**
   * Reads `CalendarEvent` rows directly via Prisma (a plain join through `calendar: { userId }`),
   * the same raw-read pattern every module since Journal/Calendar uses for a cross-feature read
   * that doesn't need another module's business logic — NotificationsModule imports no sibling
   * module, matching that precedent. Not called by anything in this milestone: it's the documented
   * seam a future scheduled worker (`main.worker.ts`, still unbuilt — see
   * docs/05-architecture.md) would invoke on an interval to actually emit
   * CalendarEventStartingEvent for events starting soon, the same "real, tested, never
   * automatically triggered" shape Calendar's own recurrence.util.ts already established for
   * "recurring event preparation."
   */
  async scanUpcomingCalendarEvents(withinMinutes = 15): Promise<number> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + withinMinutes * 60_000);

    const upcoming = await this.prisma.calendarEvent.findMany({
      where: {
        status: 'ACTIVE',
        startTime: { gte: now, lte: windowEnd },
      },
      include: { calendar: { select: { userId: true } } },
    });

    for (const calendarEvent of upcoming) {
      await this.handleCalendarEventStarting(
        new CalendarEventStartingEvent(
          calendarEvent.calendar.userId,
          calendarEvent.id,
          calendarEvent.title,
          calendarEvent.startTime,
        ),
      );
    }

    return upcoming.length;
  }

  private async createAndEnqueue(
    userId: string,
    type: NotificationType,
    template: {
      title: string;
      message: string;
      priority: NotificationPriority;
    },
    payload: Record<string, unknown>,
  ): Promise<void> {
    const preference = await this.preferences.getOrCreate(userId);
    if (!this.preferences.isCategoryEnabled(preference, type)) {
      return;
    }

    const scheduledFor = computeScheduledFor(
      new Date(),
      preference.timezone,
      preference.quietHoursStart,
      preference.quietHoursEnd,
    );

    const notification = await this.notifications.create({
      userId,
      title: template.title,
      message: template.message,
      type,
      priority: template.priority,
      scheduledFor,
      payload,
    });

    await this.queue.enqueue(notification.id, scheduledFor);
    this.logger.debug(
      `Queued ${type} notification ${notification.id} for user ${userId}`,
    );
  }
}
