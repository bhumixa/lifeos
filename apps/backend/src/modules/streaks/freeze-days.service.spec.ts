import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  FreezeDaysService,
  FREEZE_DAYS_PER_MONTH,
} from './freeze-days.service.js';

describe('FreezeDaysService', () => {
  let service: FreezeDaysService;
  let prisma: {
    user: { findUnique: jest.Mock };
    freezeDay: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
  };

  const userId = 'user-1';

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00.000Z'));

    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ timezone: 'UTC' }) },
      freezeDay: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreezeDaysService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(FreezeDaysService);
  });

  afterEach(() => jest.useRealTimers());

  describe('use', () => {
    it('creates a consumed FreezeDay for today when no date is given', async () => {
      prisma.freezeDay.findUnique.mockResolvedValue(null);
      prisma.freezeDay.count.mockResolvedValue(0);
      prisma.freezeDay.create.mockResolvedValue({});

      await service.use(userId, {});

      expect(prisma.freezeDay.create).toHaveBeenCalledWith({
        data: {
          userId,
          date: new Date('2026-07-15T00:00:00.000Z'),
          consumed: true,
        },
      });
    });

    it('rejects a future date', async () => {
      await expect(
        service.use(userId, { date: '2026-07-16' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.freezeDay.create).not.toHaveBeenCalled();
    });

    it('rejects a date that has already been frozen', async () => {
      prisma.freezeDay.findUnique.mockResolvedValue({ id: 'freeze-1' });

      await expect(
        service.use(userId, { date: '2026-07-10' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.freezeDay.create).not.toHaveBeenCalled();
    });

    it('rejects once the monthly quota is exhausted', async () => {
      prisma.freezeDay.findUnique.mockResolvedValue(null);
      prisma.freezeDay.count.mockResolvedValue(FREEZE_DAYS_PER_MONTH);

      await expect(
        service.use(userId, { date: '2026-07-10' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.freezeDay.create).not.toHaveBeenCalled();
    });

    it('spends the quota of the month being frozen, not the current month', async () => {
      prisma.freezeDay.findUnique.mockResolvedValue(null);
      prisma.freezeDay.count.mockResolvedValue(0);
      prisma.freezeDay.create.mockResolvedValue({});

      await service.use(userId, { date: '2026-06-30' });

      expect(prisma.freezeDay.count).toHaveBeenCalledWith({
        where: {
          userId,
          consumed: true,
          date: {
            gte: new Date('2026-06-01T00:00:00.000Z'),
            lt: new Date('2026-07-01T00:00:00.000Z'),
          },
        },
      });
    });
  });

  describe('getStatus', () => {
    it('reports remaining quota and whether today is already frozen', async () => {
      prisma.freezeDay.count.mockResolvedValue(1);
      prisma.freezeDay.findUnique.mockResolvedValue({ consumed: true });

      const status = await service.getStatus(userId);

      expect(status).toEqual({
        date: '2026-07-15',
        usedThisMonth: 1,
        remainingThisMonth: FREEZE_DAYS_PER_MONTH - 1,
        monthlyQuota: FREEZE_DAYS_PER_MONTH,
        isDateFrozen: true,
      });
    });

    it('never reports negative remaining quota', async () => {
      prisma.freezeDay.count.mockResolvedValue(FREEZE_DAYS_PER_MONTH + 5);
      prisma.freezeDay.findUnique.mockResolvedValue(null);

      const status = await service.getStatus(userId);
      expect(status.remainingThisMonth).toBe(0);
    });
  });

  describe('getFrozenDates', () => {
    it('returns consumed freeze dates as YYYY-MM-DD strings', async () => {
      prisma.freezeDay.findMany.mockResolvedValue([
        { date: new Date('2026-07-01T00:00:00.000Z') },
        { date: new Date('2026-07-05T00:00:00.000Z') },
      ]);

      const dates = await service.getFrozenDates(userId, '2026-06-01');

      expect(dates).toEqual(new Set(['2026-07-01', '2026-07-05']));
      expect(prisma.freezeDay.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          consumed: true,
          date: { gte: new Date('2026-06-01T00:00:00.000Z') },
        },
        select: { date: true },
      });
    });
  });
});
