import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  CalendarProvider,
  type Calendar,
} from '../../../generated/prisma/index.js';
import { CalendarService } from './calendar.service.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: {
    calendar: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    calendarEvent: { count: jest.Mock };
    calendarSync: { findFirst: jest.Mock };
  };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  function makeCalendar(overrides: Partial<Calendar> = {}): Calendar {
    return {
      id: 'calendar-1',
      userId,
      name: 'Personal',
      provider: CalendarProvider.LOCAL,
      color: '#3F51B5',
      timezone: 'UTC',
      enabled: true,
      createdAt: new Date('2026-07-04T00:00:00.000Z'),
      updatedAt: new Date('2026-07-04T00:00:00.000Z'),
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      calendar: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      calendarEvent: { count: jest.fn().mockResolvedValue(0) },
      calendarSync: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CalendarService);
  });

  describe('findAll', () => {
    it('scopes the query to the requesting user', async () => {
      prisma.calendar.findMany.mockResolvedValue([makeCalendar()]);

      await service.findAll(userId, {});

      expect(prisma.calendar.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.calendar.findMany>[0]>({
          where: matching({ userId }),
        }),
      );
    });

    it('includes eventCount and lastSyncedAt derived from other tables', async () => {
      prisma.calendar.findMany.mockResolvedValue([makeCalendar()]);
      prisma.calendarEvent.count.mockResolvedValue(3);
      prisma.calendarSync.findFirst.mockResolvedValue({
        lastSync: new Date('2026-07-04T10:00:00.000Z'),
      });

      const [result] = await service.findAll(userId, {});

      expect(result.eventCount).toBe(3);
      expect(result.lastSyncedAt).toEqual(new Date('2026-07-04T10:00:00.000Z'));
    });
  });

  describe('findOne / cross-user isolation', () => {
    it('throws NotFoundException when the calendar does not exist or belongs to someone else', async () => {
      prisma.calendar.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(otherUserId, 'calendar-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('findCalendarOrThrow scopes its Prisma lookup by userId, not just id', async () => {
      prisma.calendar.findFirst.mockResolvedValue(null);

      await expect(
        service.findCalendarOrThrow(otherUserId, 'calendar-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.calendar.findFirst).toHaveBeenCalledWith({
        where: { id: 'calendar-1', userId: otherUserId },
      });
    });
  });

  describe('create', () => {
    it('defaults provider to LOCAL when the client sets nothing', async () => {
      prisma.calendar.create.mockResolvedValue(makeCalendar());

      await service.create(userId, { name: 'Personal', color: '#3F51B5' });

      expect(prisma.calendar.create).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.calendar.create>[0]>({
          data: matching({ userId, name: 'Personal' }),
        }),
      );
    });

    it('allows creating a non-LOCAL provider row without any external call', async () => {
      prisma.calendar.create.mockResolvedValue(
        makeCalendar({ provider: CalendarProvider.GOOGLE }),
      );

      const result = await service.create(userId, {
        name: 'Work (Google)',
        color: '#00ACC1',
        provider: CalendarProvider.GOOGLE,
      });

      expect(result.provider).toBe(CalendarProvider.GOOGLE);
    });
  });

  describe('update', () => {
    it('verifies ownership before updating', async () => {
      prisma.calendar.findFirst.mockResolvedValue(null);

      await expect(
        service.update(otherUserId, 'calendar-1', { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.calendar.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('hard-deletes (not a soft delete) once ownership is verified', async () => {
      prisma.calendar.findFirst.mockResolvedValue(makeCalendar());
      prisma.calendar.delete.mockResolvedValue(makeCalendar());

      await service.remove(userId, 'calendar-1');

      expect(prisma.calendar.delete).toHaveBeenCalledWith({
        where: { id: 'calendar-1' },
      });
    });

    it('throws NotFoundException for someone else’s calendar rather than deleting it', async () => {
      prisma.calendar.findFirst.mockResolvedValue(null);

      await expect(service.remove(otherUserId, 'calendar-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.calendar.delete).not.toHaveBeenCalled();
    });
  });
});
