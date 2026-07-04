import { Injectable } from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
} from '../../../generated/prisma/index.js';

export interface NotificationTemplate {
  title: string;
  message: string;
  priority: NotificationPriority;
}

/**
 * Turns one domain event into a `{ title, message, priority }` triple — kept as its own service
 * (rather than inlined in NotificationSchedulerService) so the "what does this event say to the
 * user" concern is independently testable from "should this event produce a notification at all"
 * (that's NotificationPreferencesService's job) and "when should it be delivered" (quiet-hours
 * util's job). Each `build*` method takes only the primitive fields its event carries — see
 * events/*.event.ts — not the whole event class, so this stays decoupled from EventEmitter2 itself.
 */
@Injectable()
export class NotificationTemplateService {
  buildTaskCompleted(title: string): NotificationTemplate {
    return {
      title: 'Task completed',
      message: `You completed "${title}". Nice work!`,
      priority: NotificationPriority.LOW,
    };
  }

  buildHabitCompleted(habitName: string, date: string): NotificationTemplate {
    return {
      title: 'Habit logged',
      message: `You logged "${habitName}" for ${date}.`,
      priority: NotificationPriority.LOW,
    };
  }

  buildPlannerBlockCompleted(title: string): NotificationTemplate {
    return {
      title: 'Schedule block completed',
      message: `You marked "${title}" as done on your planner.`,
      priority: NotificationPriority.LOW,
    };
  }

  buildGoalCompleted(title: string): NotificationTemplate {
    return {
      title: 'Goal completed',
      message: `You completed your goal "${title}" — congratulations!`,
      priority: NotificationPriority.HIGH,
    };
  }

  buildJournalCreated(type: string): NotificationTemplate {
    return {
      title: 'Journal entry saved',
      message: `Your ${type.toLowerCase()} journal entry was saved.`,
      priority: NotificationPriority.LOW,
    };
  }

  buildAchievementUnlocked(
    title: string,
    xpReward: number,
  ): NotificationTemplate {
    return {
      title: 'Achievement unlocked',
      message: `You unlocked "${title}" (+${xpReward} XP)!`,
      priority: NotificationPriority.HIGH,
    };
  }

  buildCalendarEventStarting(title: string): NotificationTemplate {
    return {
      title: 'Upcoming event',
      message: `"${title}" is starting soon.`,
      priority: NotificationPriority.HIGH,
    };
  }

  /** Maps a NotificationType category to a default priority when a caller (e.g. a future SYSTEM
   * notification) has no dedicated `build*` method above — kept for completeness of the
   * NotificationType enum rather than left to throw on an unhandled case. */
  defaultPriorityFor(type: NotificationType): NotificationPriority {
    return type === NotificationType.SYSTEM
      ? NotificationPriority.NORMAL
      : NotificationPriority.LOW;
  }
}
