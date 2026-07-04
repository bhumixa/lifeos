import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  CalendarProvider,
  CalendarSource,
  CalendarStatus,
  type CalendarEvent,
} from '../../../generated/prisma/index.js';
import { CalendarEventsService } from './calendar-events.service.js';
import { CalendarService } from './calendar.service.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('CalendarEventsService', () => {
  let service: CalendarEventsService;
  let prisma: {
    calendarEvent: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    task: { findFirst: jest.Mock };
    goal: { findFirst: jest.Mock };
    plannerBlock: { findFirst: jest.Mock };
    journalEntry: { findFirst: jest.Mock };
  };
  let calendarService: { findCalendarOrThrow: jest.Mock };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    return {
      id: 'event-1',
      calendarId: 'calendar-1',
      plannerBlockId: null,
      taskId: null,
      goalId: null,
      journalEntryId: null,
      externalId: null,
      title: 'Dentist appointment',
      description: null,
      startTime: new Date('2026-07-06T14:00:00.000Z'),
      endTime: new Date('2026-07-06T15:00:00.000Z'),
      allDay: false,
      location: null,
      source: CalendarSource.LOCAL,
      status: CalendarStatus.ACTIVE,
      createdAt: new Date('2026-07-04T00:00:00.000Z'),
      updatedAt: new Date('2026-07-04T00:00:00.000Z'),
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      calendarEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      task: { findFirst: jest.fn() },
      goal: { findFirst: jest.fn() },
      plannerBlock: { findFirst: jest.fn() },
      journalEntry: { findFirst: jest.fn() },
    };
    calendarService = {
      findCalendarOrThrow: jest.fn().mockResolvedValue({ id: 'calendar-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CalendarService, useValue: calendarService },
      ],
    }).compile();

    service = module.get(CalendarEventsService);
  });

  describe('cross-user isolation', () => {
    it('findOne scopes its lookup through calendar.userId, not just the event id', async () => {
      prisma.calendarEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(otherUserId, 'event-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.calendarEvent.findFirst).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.calendarEvent.findFirst>[0]>({
          where: matching({
            id: 'event-1',
            calendar: matching({ userId: otherUserId }),
          }),
        }),
      );
    });

    it('findAll scopes the query through calendar.userId', async () => {
      await service.findAll(userId, {});

      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.calendarEvent.findMany>[0]>({
          where: matching({ calendar: matching({ userId }) }),
        }),
      );
    });
  });

  describe('create', () => {
    const baseDto = {
      calendarId: 'calendar-1',
      title: 'Dentist appointment',
      startTime: '2026-07-06T14:00:00.000Z',
      endTime: '2026-07-06T15:00:00.000Z',
    };

    it('verifies the calendar belongs to the requesting user before creating', async () => {
      prisma.calendarEvent.create.mockResolvedValue(makeEvent());

      await service.create(userId, baseDto);

      expect(calendarService.findCalendarOrThrow).toHaveBeenCalledWith(
        userId,
        'calendar-1',
      );
    });

    it('rejects endTime at or before startTime', async () => {
      await expect(
        service.create(userId, {
          ...baseDto,
          startTime: '2026-07-06T15:00:00.000Z',
          endTime: '2026-07-06T14:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
    });

    it('validates plannerBlockId ownership before linking (planner blocks may create events)', async () => {
      prisma.plannerBlock.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, { ...baseDto, plannerBlockId: 'block-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.plannerBlock.findFirst).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.plannerBlock.findFirst>[0]>({
          where: matching({ id: 'block-1', plannerDay: matching({ userId }) }),
        }),
      );
      expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
    });

    it('validates taskId ownership before linking (tasks may optionally create events)', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, { ...baseDto, taskId: 'task-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.task.findFirst).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.task.findFirst>[0]>({
          where: matching({ id: 'task-1', userId, deletedAt: null }),
        }),
      );
    });

    it('validates goalId ownership before linking (goals may create milestone events)', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, { ...baseDto, goalId: 'goal-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('validates journalEntryId ownership before linking (journal entries remain read-only references)', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, { ...baseDto, journalEntryId: 'entry-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates the event once every ownership check passes', async () => {
      prisma.plannerBlock.findFirst.mockResolvedValue({ id: 'block-1' });
      prisma.calendarEvent.create.mockResolvedValue(
        makeEvent({ plannerBlockId: 'block-1' }),
      );

      const result = await service.create(userId, {
        ...baseDto,
        plannerBlockId: 'block-1',
      });

      expect(result.plannerBlockId).toBe('block-1');
    });
  });

  describe('update', () => {
    it('verifies ownership before updating', async () => {
      prisma.calendarEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.update(otherUserId, 'event-1', { title: 'New title' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.calendarEvent.update).not.toHaveBeenCalled();
    });

    it('rejects an updated range where endTime is not after startTime', async () => {
      prisma.calendarEvent.findFirst.mockResolvedValue(makeEvent());

      await expect(
        service.update(userId, 'event-1', {
          startTime: '2026-07-06T15:00:00.000Z',
          endTime: '2026-07-06T14:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('hard-deletes once ownership is verified', async () => {
      prisma.calendarEvent.findFirst.mockResolvedValue(makeEvent());

      await service.remove(userId, 'event-1');

      expect(prisma.calendarEvent.delete).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });
    });
  });

  describe('conflict detection', () => {
    it('flags overlapping ACTIVE events in the same calendar', async () => {
      const event = makeEvent();
      prisma.calendarEvent.findFirst.mockResolvedValue(event);
      prisma.calendarEvent.findMany.mockResolvedValue([
        {
          id: 'event-2',
          startTime: new Date('2026-07-06T14:30:00.000Z'),
          endTime: new Date('2026-07-06T15:30:00.000Z'),
        },
      ]);

      const result = await service.findOne(userId, 'event-1');

      expect(result.conflictsWith).toEqual(['event-2']);
    });

    it('does not flag non-overlapping events', async () => {
      const event = makeEvent();
      prisma.calendarEvent.findFirst.mockResolvedValue(event);
      prisma.calendarEvent.findMany.mockResolvedValue([
        {
          id: 'event-2',
          startTime: new Date('2026-07-06T15:00:00.000Z'),
          endTime: new Date('2026-07-06T16:00:00.000Z'),
        },
      ]);

      const result = await service.findOne(userId, 'event-1');

      expect(result.conflictsWith).toEqual([]);
    });

    it('never flags conflicts for a DISABLED event', async () => {
      const event = makeEvent({ status: CalendarStatus.DISABLED });
      prisma.calendarEvent.findFirst.mockResolvedValue(event);

      const result = await service.findOne(userId, 'event-1');

      expect(result.conflictsWith).toEqual([]);
      expect(prisma.calendarEvent.findMany).not.toHaveBeenCalled();
    });
  });

  describe('provider-agnostic events', () => {
    it('an event created against a non-LOCAL Calendar is still created without any external call', async () => {
      calendarService.findCalendarOrThrow.mockResolvedValue({
        id: 'calendar-2',
        provider: CalendarProvider.GOOGLE,
      });
      prisma.calendarEvent.create.mockResolvedValue(
        makeEvent({ calendarId: 'calendar-2' }),
      );

      const result = await service.create(userId, {
        calendarId: 'calendar-2',
        title: 'Dentist appointment',
        startTime: '2026-07-06T14:00:00.000Z',
        endTime: '2026-07-06T15:00:00.000Z',
      });

      expect(result.calendarId).toBe('calendar-2');
    });
  });
});
