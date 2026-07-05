import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma/index.js';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AnalyticsSnapshotService } from './analytics-snapshot.service.js';
import { AnalyticsService } from './analytics.service.js';

interface SnapshotRow {
  snapshotDate: Date;
  productivityScore: number;
  habitScore: number;
  plannerScore: number;
  goalScore: number;
  journalScore: number;
  focusMinutes: number;
  streakDays: number;
}

function toScores(r: SnapshotRow) {
  return {
    snapshotDate: '2026-07-05',
    productivityScore: r.productivityScore,
    habitScore: r.habitScore,
    plannerScore: r.plannerScore,
    goalScore: r.goalScore,
    journalScore: r.journalScore,
    focusMinutes: r.focusMinutes,
    streakDays: r.streakDays,
  };
}

describe('AnalyticsSnapshotService', () => {
  let service: AnalyticsSnapshotService;
  let prisma: {
    analyticsSnapshot: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };
  let analytics: {
    getTodayDateString: jest.Mock;
    computeTodayScores: jest.Mock;
  };

  const userId = 'user-1';
  const row = {
    snapshotDate: new Date('2026-07-05T00:00:00.000Z'),
    productivityScore: 70,
    habitScore: 60,
    plannerScore: 80,
    goalScore: 50,
    journalScore: 40,
    focusMinutes: 90,
    streakDays: 3,
  };

  beforeEach(async () => {
    prisma = {
      analyticsSnapshot: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    analytics = {
      getTodayDateString: jest.fn().mockResolvedValue('2026-07-05'),
      computeTodayScores: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsSnapshotService,
        { provide: PrismaService, useValue: prisma },
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compile();

    service = module.get(AnalyticsSnapshotService);
  });

  it('returns the existing row on a cache hit without recomputing scores', async () => {
    prisma.analyticsSnapshot.findUnique.mockResolvedValue(row);

    const result = await service.getOrCreateToday(userId);

    expect(result).toEqual({ ...toScores(row), cached: true });
    expect(analytics.computeTodayScores).not.toHaveBeenCalled();
  });

  it('computes and persists a new row on a cache miss', async () => {
    prisma.analyticsSnapshot.findUnique.mockResolvedValue(null);
    analytics.computeTodayScores.mockResolvedValue({
      snapshotDate: '2026-07-05',
      productivityScore: 70,
      habitScore: 60,
      plannerScore: 80,
      goalScore: 50,
      journalScore: 40,
      focusMinutes: 90,
      streakDays: 3,
    });
    prisma.analyticsSnapshot.create.mockResolvedValue(row);

    const result = await service.getOrCreateToday(userId);

    expect(prisma.analyticsSnapshot.create).toHaveBeenCalledWith({
      data: {
        userId,
        snapshotDate: new Date('2026-07-05T00:00:00.000Z'),
        productivityScore: 70,
        habitScore: 60,
        plannerScore: 80,
        goalScore: 50,
        journalScore: 40,
        focusMinutes: 90,
        streakDays: 3,
      },
    });
    expect(result.cached).toBe(false);
  });

  it('falls back to reading the row a concurrent request already created, rather than throwing', async () => {
    prisma.analyticsSnapshot.findUnique.mockResolvedValue(null);
    analytics.computeTodayScores.mockResolvedValue({
      snapshotDate: '2026-07-05',
      productivityScore: 70,
      habitScore: 60,
      plannerScore: 80,
      goalScore: 50,
      journalScore: 40,
      focusMinutes: 90,
      streakDays: 3,
    });
    const uniqueViolation = new Prisma.PrismaClientKnownRequestError(
      'duplicate',
      {
        code: 'P2002',
        clientVersion: '6.19.3',
      },
    );
    prisma.analyticsSnapshot.create.mockRejectedValue(uniqueViolation);
    prisma.analyticsSnapshot.findUniqueOrThrow.mockResolvedValue(row);

    const result = await service.getOrCreateToday(userId);

    expect(result).toEqual({ ...toScores(row), cached: true });
  });
});
