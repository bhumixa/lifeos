import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { NotificationPreference } from '../../../generated/prisma/index.js';
import type { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto.js';

/**
 * Owns the per-user (1:1) NotificationPreference row. Auto-created with defaults on first access —
 * the same "find-or-create on first read" convention PlannerDay/HabitLog already use for their own
 * per-user rows — rather than provisioned at registration time, since nothing needed it before
 * this milestone. `timezone` is seeded from `User.timezone` at creation (not re-read from User on
 * every check), the same "own column, independent from here on" shape Calendar.timezone already
 * uses — see the class doc on NotificationPreference in prisma/schema.prisma.
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string): Promise<NotificationPreference> {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    return this.prisma.notificationPreference.create({
      data: { userId, timezone: user?.timezone ?? 'UTC' },
    });
  }

  async update(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    await this.getOrCreate(userId);
    return this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        ...(dto.quietHoursStart !== undefined && {
          quietHoursStart: dto.quietHoursStart,
        }),
        ...(dto.quietHoursEnd !== undefined && {
          quietHoursEnd: dto.quietHoursEnd,
        }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.enableTasks !== undefined && {
          enableTasks: dto.enableTasks,
        }),
        ...(dto.enableHabits !== undefined && {
          enableHabits: dto.enableHabits,
        }),
        ...(dto.enablePlanner !== undefined && {
          enablePlanner: dto.enablePlanner,
        }),
        ...(dto.enableGoals !== undefined && { enableGoals: dto.enableGoals }),
        ...(dto.enableJournal !== undefined && {
          enableJournal: dto.enableJournal,
        }),
        ...(dto.enableCalendar !== undefined && {
          enableCalendar: dto.enableCalendar,
        }),
        ...(dto.enableStreaks !== undefined && {
          enableStreaks: dto.enableStreaks,
        }),
        ...(dto.enableAchievements !== undefined && {
          enableAchievements: dto.enableAchievements,
        }),
        ...(dto.enableEmail !== undefined && { enableEmail: dto.enableEmail }),
        ...(dto.enablePush !== undefined && { enablePush: dto.enablePush }),
        ...(dto.enableInApp !== undefined && { enableInApp: dto.enableInApp }),
      },
    });
  }

  /** Whether this NotificationType's category is currently enabled for this user — the single
   * check NotificationSchedulerService runs before creating any Notification row at all (per this
   * milestone's own "respect notification preferences" business rule). */
  isCategoryEnabled(
    preference: NotificationPreference,
    type:
      | 'TASK'
      | 'HABIT'
      | 'PLANNER'
      | 'GOAL'
      | 'JOURNAL'
      | 'CALENDAR'
      | 'STREAK'
      | 'ACHIEVEMENT'
      | 'SYSTEM',
  ): boolean {
    switch (type) {
      case 'TASK':
        return preference.enableTasks;
      case 'HABIT':
        return preference.enableHabits;
      case 'PLANNER':
        return preference.enablePlanner;
      case 'GOAL':
        return preference.enableGoals;
      case 'JOURNAL':
        return preference.enableJournal;
      case 'CALENDAR':
        return preference.enableCalendar;
      case 'STREAK':
        return preference.enableStreaks;
      case 'ACHIEVEMENT':
        return preference.enableAchievements;
      case 'SYSTEM':
        return true;
    }
  }
}
