import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ACHIEVEMENT_DEFINITIONS } from './utils/achievement-definitions.js';
import { AchievementsService } from './achievements.service.js';

interface CreateManyCallArg {
  data: Array<{ userId: string; achievementId: string }>;
}

/** Extracts the `data` argument of a `prisma.userAchievement.createMany` call, typed concretely
 * so indexing into it doesn't trip @typescript-eslint/no-unsafe-member-access the way indexing
 * `jest.Mock.mock.calls` (typed `any[][]`) directly would — same pattern
 * planner.service.spec.ts's `createdBlocksOfType` helper uses. */
function createManyData(mock: jest.Mock): CreateManyCallArg['data'] {
  return (mock.mock.calls as [CreateManyCallArg][])[0][0].data;
}

describe('AchievementsService', () => {
  let service: AchievementsService;
  let prisma: {
    achievement: { upsert: jest.Mock; findMany: jest.Mock };
    userAchievement: { findMany: jest.Mock; createMany: jest.Mock };
  };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  const catalog = ACHIEVEMENT_DEFINITIONS.map((def, index) => ({
    id: `achievement-${index}`,
    code: def.code,
    title: def.title,
    description: def.description,
    icon: def.icon,
    xpReward: def.xpReward,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  }));

  const BASE_CONTEXT = {
    totalHabitCompletions: 0,
    totalTasksCompleted: 0,
    totalRoutineCompletions: 0,
    totalCompletedPlannerBlocks: 0,
    longestStreak: 0,
    isPerfectWeek: false,
    isPerfectMonth: false,
    morningHabitLogCount: 0,
    nightHabitLogCount: 0,
  };

  beforeEach(async () => {
    prisma = {
      achievement: { upsert: jest.fn(), findMany: jest.fn() },
      userAchievement: { findMany: jest.fn(), createMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AchievementsService);
  });

  describe('onModuleInit', () => {
    it('upserts every catalog definition by its unique code', async () => {
      prisma.achievement.upsert.mockResolvedValue({});

      await service.onModuleInit();

      expect(prisma.achievement.upsert).toHaveBeenCalledTimes(
        ACHIEVEMENT_DEFINITIONS.length,
      );
      expect(prisma.achievement.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'FIRST_HABIT' } }),
      );
    });
  });

  describe('getAll / getUnlocked', () => {
    it('marks achievements the user has unlocked and leaves the rest locked', async () => {
      prisma.achievement.findMany.mockResolvedValue(catalog);
      prisma.userAchievement.findMany.mockResolvedValue([
        {
          achievementId: catalog[0].id,
          unlockedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ]);

      const all = await service.getAll(userId);
      expect(all.find((a) => a.code === 'FIRST_HABIT')).toMatchObject({
        unlocked: true,
        unlockedAt: new Date('2026-07-01T00:00:00.000Z'),
      });
      expect(all.find((a) => a.code === 'STREAK_3')).toMatchObject({
        unlocked: false,
        unlockedAt: null,
      });

      const unlocked = await service.getUnlocked(userId);
      expect(unlocked).toHaveLength(1);
      expect(unlocked[0].code).toBe('FIRST_HABIT');
    });
  });

  describe('evaluateAndUnlock', () => {
    it('unlocks every newly-satisfied achievement and skips already-unlocked ones', async () => {
      prisma.achievement.findMany.mockResolvedValue(catalog);
      prisma.userAchievement.findMany.mockResolvedValue([]);
      prisma.userAchievement.createMany.mockResolvedValue({ count: 2 });

      await service.evaluateAndUnlock(userId, {
        ...BASE_CONTEXT,
        totalHabitCompletions: 1,
        longestStreak: 3,
      });

      const firstHabitId = catalog.find((a) => a.code === 'FIRST_HABIT')!.id;
      const streak3Id = catalog.find((a) => a.code === 'STREAK_3')!.id;

      const insertedRows = createManyData(prisma.userAchievement.createMany);
      expect(insertedRows).toHaveLength(2);
      expect(insertedRows).toEqual(
        expect.arrayContaining([
          { userId, achievementId: firstHabitId },
          { userId, achievementId: streak3Id },
        ]),
      );
    });

    it('does nothing when no new condition is satisfied', async () => {
      prisma.achievement.findMany.mockResolvedValue(catalog);
      prisma.userAchievement.findMany.mockResolvedValue([]);

      await service.evaluateAndUnlock(userId, BASE_CONTEXT);

      expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
    });

    it('does not re-unlock an achievement the user already has', async () => {
      prisma.achievement.findMany.mockResolvedValue(catalog);
      const firstHabitId = catalog.find((a) => a.code === 'FIRST_HABIT')!.id;
      prisma.userAchievement.findMany.mockResolvedValue([
        { achievementId: firstHabitId },
      ]);

      await service.evaluateAndUnlock(userId, {
        ...BASE_CONTEXT,
        totalHabitCompletions: 1,
      });

      expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
    });

    it('scopes its unlock lookup to the requesting user only', async () => {
      prisma.achievement.findMany.mockResolvedValue(catalog);
      prisma.userAchievement.findMany.mockResolvedValue([]);
      prisma.userAchievement.createMany.mockResolvedValue({ count: 1 });

      await service.evaluateAndUnlock(otherUserId, {
        ...BASE_CONTEXT,
        totalHabitCompletions: 1,
      });

      expect(prisma.userAchievement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: otherUserId } }),
      );
      const data = createManyData(prisma.userAchievement.createMany);
      expect(data.every((row) => row.userId === otherUserId)).toBe(true);
    });
  });
});
