import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  AchievementUnlockedEvent,
  NOTIFICATION_EVENTS,
} from '../../events/index.js';
import type { AchievementResponseDto } from './dto/achievement-response.dto.js';
import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementContext,
} from './utils/achievement-definitions.js';

/**
 * Owns the Achievement catalog and per-user unlock state. The catalog itself is upserted from
 * `ACHIEVEMENT_DEFINITIONS` once at boot (`onModuleInit`) rather than via a separate `prisma db
 * seed` script — one source of truth (the TS array) instead of two that could drift; re-running
 * migrations/restarting the app is always safe since `upsert` is idempotent.
 *
 * **Evaluation is a pull, not a push**: `evaluateAndUnlock` is only ever called by
 * StreaksService, as a side effect of building GET /streaks/statistics's response — the one
 * endpoint that already computes every input every achievement condition needs (XP totals,
 * longest streak, perfect week/month, morning/night counts). GET /achievements* here just reads
 * whatever's already been persisted; it does not itself trigger evaluation, both to avoid a
 * circular StreaksService <-> AchievementsService dependency and to guarantee every unlock check
 * runs against one consistent, fully-computed context rather than whatever partial subset the
 * calling endpoint happens to have on hand. Since the Dashboard calls GET /streaks/statistics on
 * every load, this is effectively "evaluated on every dashboard visit" in practice — see
 * docs/05-architecture.md for the fuller rationale and its known limitation for
 * PERFECT_WEEK/PERFECT_MONTH specifically.
 */
@Injectable()
export class AchievementsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      await this.prisma.achievement.upsert({
        where: { code: definition.code },
        update: {
          title: definition.title,
          description: definition.description,
          icon: definition.icon,
          xpReward: definition.xpReward,
        },
        create: {
          code: definition.code,
          title: definition.title,
          description: definition.description,
          icon: definition.icon,
          xpReward: definition.xpReward,
        },
      });
    }
  }

  async getAll(userId: string): Promise<AchievementResponseDto[]> {
    const [achievements, unlocks] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.userAchievement.findMany({ where: { userId } }),
    ]);

    const unlockedAtByAchievementId = new Map(
      unlocks.map((unlock) => [unlock.achievementId, unlock.unlockedAt]),
    );

    return achievements.map((achievement) => ({
      id: achievement.id,
      code: achievement.code,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      xpReward: achievement.xpReward,
      unlocked: unlockedAtByAchievementId.has(achievement.id),
      unlockedAt: unlockedAtByAchievementId.get(achievement.id) ?? null,
    }));
  }

  async getUnlocked(userId: string): Promise<AchievementResponseDto[]> {
    const all = await this.getAll(userId);
    return all.filter((achievement) => achievement.unlocked);
  }

  /** Persists a UserAchievement row for any definition whose condition `context` newly
   * satisfies and that doesn't already have one — idempotent, so re-evaluating an
   * already-unlocked achievement (or one whose condition has since gone false again, e.g.
   * PERFECT_WEEK next week) is always a safe no-op. */
  async evaluateAndUnlock(
    userId: string,
    context: AchievementContext,
  ): Promise<void> {
    const [achievements, unlocks] = await Promise.all([
      this.prisma.achievement.findMany(),
      this.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true },
      }),
    ]);

    const achievementByCode = new Map(
      achievements.map((achievement) => [achievement.code, achievement]),
    );
    const unlockedAchievementIds = new Set(
      unlocks.map((unlock) => unlock.achievementId),
    );

    const newlyUnlocked = ACHIEVEMENT_DEFINITIONS.filter((definition) => {
      const achievement = achievementByCode.get(definition.code);
      return (
        achievement &&
        !unlockedAchievementIds.has(achievement.id) &&
        definition.isUnlocked(context)
      );
    }).map((definition) => achievementByCode.get(definition.code)!);

    if (newlyUnlocked.length === 0) {
      return;
    }

    await this.prisma.userAchievement.createMany({
      data: newlyUnlocked.map((achievement) => ({
        userId,
        achievementId: achievement.id,
      })),
      skipDuplicates: true,
    });

    // One AchievementUnlockedEvent per newly-unlocked achievement (Milestone 12) — emitted after
    // the createMany above, so a listener that reads UserAchievement back (e.g. a future
    // audit/analytics consumer) always sees the row already persisted.
    for (const achievement of newlyUnlocked) {
      this.eventEmitter.emit(
        NOTIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED,
        new AchievementUnlockedEvent(
          userId,
          achievement.id,
          achievement.title,
          achievement.xpReward,
        ),
      );
    }
  }
}
