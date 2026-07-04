import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  Energy,
  JournalType,
  Mood,
  type JournalAttachment,
  type JournalEntry,
} from '../../../generated/prisma/index.js';
import { JournalService } from './journal.service.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('JournalService', () => {
  let service: JournalService;
  let prisma: {
    journalEntry: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    journalAttachment: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
    journalPrompt: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    goal: { findFirst: jest.Mock };
    plannerDay: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry & {
    attachments: JournalAttachment[];
  } {
    return {
      id: 'entry-1',
      userId,
      date: new Date('2026-07-04T00:00:00.000Z'),
      type: JournalType.FREEFORM,
      title: null,
      content: 'Just a normal day.',
      mood: null,
      energy: null,
      productivity: null,
      gratitude: [],
      wins: [],
      lessons: null,
      tomorrowPlan: null,
      tags: [],
      weather: null,
      location: null,
      intention: null,
      topPriorities: [],
      affirmation: null,
      visualization: null,
      expectedChallenges: null,
      wentWell: null,
      wentWrong: null,
      plannerReflection: null,
      habitReflection: null,
      goalReflection: null,
      goalId: null,
      plannerDayId: null,
      createdAt: new Date('2026-07-04T08:00:00.000Z'),
      updatedAt: new Date('2026-07-04T08:00:00.000Z'),
      deletedAt: null,
      attachments: [],
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      journalEntry: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      journalAttachment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      journalPrompt: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      goal: { findFirst: jest.fn() },
      plannerDay: { findFirst: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(JournalService);
  });

  describe('create — Morning/Evening uniqueness', () => {
    it('rejects a second MORNING entry for a date that already has one', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(userId, {
          date: '2026-07-04',
          type: JournalType.MORNING,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    });

    it('rejects a second EVENING entry for a date that already has one', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(userId, {
          date: '2026-07-04',
          type: JournalType.EVENING,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows a MORNING entry when no entry exists yet for that date', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(null);
      prisma.journalEntry.create.mockResolvedValue(
        makeEntry({ type: JournalType.MORNING }),
      );

      await service.create(userId, {
        date: '2026-07-04',
        type: JournalType.MORNING,
      });

      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });

    it('allows unlimited FREEFORM entries on the same date — never checks for an existing one', async () => {
      prisma.journalEntry.create.mockResolvedValue(makeEntry());

      await service.create(userId, {
        date: '2026-07-04',
        type: JournalType.FREEFORM,
      });

      expect(prisma.journalEntry.findFirst).not.toHaveBeenCalled();
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });

    it('checks uniqueness scoped to the requesting user, not globally', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(null);
      prisma.journalEntry.create.mockResolvedValue(
        makeEntry({ type: JournalType.MORNING }),
      );

      await service.create(userId, {
        date: '2026-07-04',
        type: JournalType.MORNING,
      });

      expect(prisma.journalEntry.findFirst).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findFirst>[0]>({
          where: matching({ userId, type: JournalType.MORNING }),
        }),
      );
    });
  });

  describe('create — Goal/Planner linking', () => {
    it('validates goalId belongs to the requesting user before creating', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          type: JournalType.FREEFORM,
          goalId: 'goal-999',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    });

    it('creates successfully with a goalId owned by the requesting user', async () => {
      prisma.goal.findFirst.mockResolvedValue({ id: 'goal-1' });
      prisma.journalEntry.create.mockResolvedValue(
        makeEntry({ goalId: 'goal-1' }),
      );

      const result = await service.create(userId, {
        type: JournalType.FREEFORM,
        goalId: 'goal-1',
      });

      expect(result.goalId).toBe('goal-1');
      expect(prisma.journalEntry.create).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.create>[0]>({
          data: matching({ goalId: 'goal-1' }),
        }),
      );
    });

    it('validates plannerDayId belongs to the requesting user before creating', async () => {
      prisma.plannerDay.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          type: JournalType.FREEFORM,
          plannerDayId: 'day-999',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    });

    it('creates successfully with a plannerDayId owned by the requesting user', async () => {
      prisma.plannerDay.findFirst.mockResolvedValue({ id: 'day-1' });
      prisma.journalEntry.create.mockResolvedValue(
        makeEntry({ plannerDayId: 'day-1' }),
      );

      const result = await service.create(userId, {
        type: JournalType.FREEFORM,
        plannerDayId: 'day-1',
      });

      expect(result.plannerDayId).toBe('day-1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException for another user’s entry (cross-user isolation)', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.update(otherUserId, 'entry-1', { title: 'Hacked' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.journalEntry.update).not.toHaveBeenCalled();
    });

    it('re-validates a newly supplied goalId on update', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(makeEntry());
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.update(userId, 'entry-1', { goalId: 'goal-999' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove — soft delete', () => {
    it('soft-deletes rather than hard-deleting', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(makeEntry());

      await service.remove(userId, 'entry-1');

      expect(prisma.journalEntry.update).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.update>[0]>({
          where: { id: 'entry-1' },
          data: matching({ deletedAt: expect.any(Date) as Date }),
        }),
      );
    });

    it('throws NotFoundException for an entry belonging to another user', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(null);

      await expect(service.remove(otherUserId, 'entry-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('excludes already-soft-deleted entries from lookups', async () => {
      // findEntryOrThrow's own where clause always includes deletedAt: null — a second remove()
      // call against an already-deleted id behaves exactly like it doesn't exist.
      prisma.journalEntry.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, 'entry-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.journalEntry.findFirst).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findFirst>[0]>({
          where: matching({ deletedAt: null }),
        }),
      );
    });
  });

  describe('findAll — pagination', () => {
    it('computes totalPages from total/pageSize', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([makeEntry()]);
      prisma.journalEntry.count.mockResolvedValue(45);

      const result = await service.findAll(userId, { page: 2, pageSize: 20 });

      expect(result.meta).toEqual({
        page: 2,
        pageSize: 20,
        total: 45,
        totalPages: 3,
      });
      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findMany>[0]>({
          skip: 20,
          take: 20,
        }),
      );
    });

    it('scopes every list to the requesting user and excludes soft-deleted entries', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([]);
      prisma.journalEntry.count.mockResolvedValue(0);

      await service.findAll(userId, {});

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findMany>[0]>({
          where: matching({ userId, deletedAt: null }),
        }),
      );
    });
  });

  describe('history', () => {
    it('filters by an inclusive date range', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([]);
      prisma.journalEntry.count.mockResolvedValue(0);

      await service.history(userId, {
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
      });

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findMany>[0]>({
          where: matching({
            date: {
              gte: new Date(Date.UTC(2026, 5, 1)),
              lte: new Date(Date.UTC(2026, 5, 30)),
            },
          }),
        }),
      );
    });

    it('orders newest-first', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([]);
      prisma.journalEntry.count.mockResolvedValue(0);

      await service.history(userId, {});

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findMany>[0]>({
          orderBy: { date: 'desc' },
        }),
      );
    });
  });

  describe('search — filters', () => {
    it('filters by mood, energy, tag, and goalId together', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([]);
      prisma.journalEntry.count.mockResolvedValue(0);

      await service.search(userId, {
        mood: Mood.GOOD,
        energy: Energy.HIGH,
        tag: 'gratitude',
        goalId: 'goal-1',
      });

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findMany>[0]>({
          where: matching({
            mood: Mood.GOOD,
            energy: Energy.HIGH,
            tags: { has: 'gratitude' },
            goalId: 'goal-1',
          }),
        }),
      );
    });

    it('performs a case-insensitive keyword match against title or content', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([]);
      prisma.journalEntry.count.mockResolvedValue(0);

      await service.search(userId, { keyword: 'gratitude' });

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findMany>[0]>({
          where: matching({
            OR: [
              { title: { contains: 'gratitude', mode: 'insensitive' } },
              { content: { contains: 'gratitude', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('scopes search to the requesting user only', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([]);
      prisma.journalEntry.count.mockResolvedValue(0);

      await service.search(userId, { keyword: 'anything' });

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findMany>[0]>({
          where: matching({ userId }),
        }),
      );
    });
  });

  describe('getByDate', () => {
    it('returns every entry for that date, oldest first', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([
        makeEntry({ id: 'morning', type: JournalType.MORNING }),
        makeEntry({ id: 'evening', type: JournalType.EVENING }),
      ]);

      const result = await service.getByDate(userId, '2026-07-04');

      expect(result.date).toBe('2026-07-04');
      expect(result.entries).toHaveLength(2);
      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        matching<Parameters<typeof prisma.journalEntry.findMany>[0]>({
          where: matching({ userId, deletedAt: null }),
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('returns an empty entries array for a date with no journaling yet', async () => {
      prisma.journalEntry.findMany.mockResolvedValue([]);

      const result = await service.getByDate(userId, '2026-07-04');

      expect(result.entries).toEqual([]);
    });
  });

  describe('addAttachment / removeAttachment', () => {
    it('validates the journal entry belongs to the requesting user before attaching', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.addAttachment(otherUserId, {
          journalId: 'entry-1',
          fileName: 'photo.jpg',
          fileType: 'image/jpeg',
          fileSize: 1024,
          url: 'https://cdn.example.com/photo.jpg',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.journalAttachment.create).not.toHaveBeenCalled();
    });

    it('creates an attachment for an owned entry', async () => {
      prisma.journalEntry.findFirst.mockResolvedValue(makeEntry());
      prisma.journalAttachment.create.mockResolvedValue({
        id: 'attachment-1',
        journalId: 'entry-1',
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
        url: 'https://cdn.example.com/photo.jpg',
        createdAt: new Date('2026-07-04T08:00:00.000Z'),
      });

      const result = await service.addAttachment(userId, {
        journalId: 'entry-1',
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024,
        url: 'https://cdn.example.com/photo.jpg',
      });

      expect(result.id).toBe('attachment-1');
    });

    it('removeAttachment throws NotFoundException when the parent entry belongs to someone else', async () => {
      prisma.journalAttachment.findFirst.mockResolvedValue(null);

      await expect(
        service.removeAttachment(otherUserId, 'attachment-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.journalAttachment.delete).not.toHaveBeenCalled();
    });

    it('removeAttachment hard-deletes (unlike the parent entry’s soft delete)', async () => {
      prisma.journalAttachment.findFirst.mockResolvedValue({
        id: 'attachment-1',
      });

      await service.removeAttachment(userId, 'attachment-1');

      expect(prisma.journalAttachment.delete).toHaveBeenCalledWith({
        where: { id: 'attachment-1' },
      });
    });
  });

  describe('getPrompts', () => {
    it('only returns active prompts, ordered', async () => {
      prisma.journalPrompt.findMany.mockResolvedValue([]);

      await service.getPrompts();

      expect(prisma.journalPrompt.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { order: 'asc' },
      });
    });

    it('filters by type when given', async () => {
      prisma.journalPrompt.findMany.mockResolvedValue([]);

      await service.getPrompts(JournalType.MORNING);

      expect(prisma.journalPrompt.findMany).toHaveBeenCalledWith({
        where: { active: true, type: JournalType.MORNING },
        orderBy: { order: 'asc' },
      });
    });
  });
});
