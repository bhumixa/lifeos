import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  InsightStatus,
  InsightType,
  type AiInsight,
} from '../../../generated/prisma/index.js';
import { AiAnalysisService } from './ai-analysis.service.js';
import { AiInsightsService } from './ai-insights.service.js';
import { AiPromptService } from './ai-prompt.service.js';
import { AiProviderRegistry } from './providers/ai-provider.registry.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

function makeInsight(overrides: Partial<AiInsight> = {}): AiInsight {
  return {
    id: 'insight-1',
    userId: 'user-1',
    type: InsightType.PRODUCTIVITY,
    title: 'Weekly Productivity Trend',
    summary: 'summary',
    content: 'content',
    confidence: 0.8,
    status: InsightStatus.ACTIVE,
    sourceData: {},
    generatedAt: new Date('2026-07-04T08:00:00.000Z'),
    expiresAt: new Date('2026-07-05T08:00:00.000Z'),
    createdAt: new Date('2026-07-04T08:00:00.000Z'),
    ...overrides,
  };
}

describe('AiInsightsService', () => {
  let service: AiInsightsService;
  let prisma: {
    aiInsight: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let analysis: { computeSourceData: jest.Mock };
  let provider: {
    name: string;
    generateInsight: jest.Mock;
    analyzeHabits: jest.Mock;
    analyzeGoals: jest.Mock;
    analyzePlanner: jest.Mock;
    analyzeJournal: jest.Mock;
    chat: jest.Mock;
  };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  beforeEach(async () => {
    prisma = {
      aiInsight: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    analysis = {
      computeSourceData: jest.fn().mockResolvedValue({ some: 'metric' }),
    };
    provider = {
      name: 'MOCK',
      generateInsight: jest.fn().mockResolvedValue({
        title: 't',
        summary: 's',
        content: 'c',
        confidence: 0.7,
      }),
      analyzeHabits: jest.fn().mockResolvedValue({
        title: 'h',
        summary: 'h',
        content: 'h',
        confidence: 0.7,
      }),
      analyzeGoals: jest.fn().mockResolvedValue({
        title: 'g',
        summary: 'g',
        content: 'g',
        confidence: 0.7,
      }),
      analyzePlanner: jest.fn().mockResolvedValue({
        title: 'p',
        summary: 'p',
        content: 'p',
        confidence: 0.7,
      }),
      analyzeJournal: jest.fn().mockResolvedValue({
        title: 'j',
        summary: 'j',
        content: 'j',
        confidence: 0.7,
      }),
      chat: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiInsightsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiAnalysisService, useValue: analysis },
        {
          provide: AiPromptService,
          useValue: { buildInsightPrompt: jest.fn().mockReturnValue('prompt') },
        },
        {
          provide: AiProviderRegistry,
          useValue: { getActive: jest.fn().mockReturnValue(provider) },
        },
      ],
    }).compile();

    service = module.get(AiInsightsService);
  });

  describe('generate', () => {
    it('generates one insight per default type when no type is requested', async () => {
      prisma.aiInsight.create.mockImplementation(
        ({ data }: { data: AiInsight }) => Promise.resolve(makeInsight(data)),
      );

      const result = await service.generate(userId, {});

      // PRODUCTIVITY, HABITS, GOALS, PLANNER, JOURNAL, STREAKS — SYSTEM excluded.
      expect(result).toHaveLength(6);
      expect(prisma.aiInsight.create).toHaveBeenCalledTimes(6);
      expect(result.map((insight) => insight.type)).not.toContain(
        InsightType.SYSTEM,
      );
    });

    it('generates exactly one insight when a type is requested', async () => {
      prisma.aiInsight.create.mockImplementation(
        ({ data }: { data: AiInsight }) => Promise.resolve(makeInsight(data)),
      );

      const result = await service.generate(userId, {
        type: InsightType.HABITS,
      });

      expect(result).toHaveLength(1);
      expect(provider.analyzeHabits).toHaveBeenCalledTimes(1);
      expect(provider.analyzeGoals).not.toHaveBeenCalled();
    });

    it('routes HABITS/GOALS/PLANNER/JOURNAL to their own dedicated provider method, not the general one', async () => {
      prisma.aiInsight.create.mockImplementation(
        ({ data }: { data: AiInsight }) => Promise.resolve(makeInsight(data)),
      );

      await service.generate(userId, { type: InsightType.GOALS });
      expect(provider.analyzeGoals).toHaveBeenCalled();
      expect(provider.generateInsight).not.toHaveBeenCalled();
    });

    it('routes PRODUCTIVITY/STREAKS to the general-purpose generateInsight method', async () => {
      prisma.aiInsight.create.mockImplementation(
        ({ data }: { data: AiInsight }) => Promise.resolve(makeInsight(data)),
      );

      await service.generate(userId, { type: InsightType.STREAKS });
      expect(provider.generateInsight).toHaveBeenCalled();
      expect(provider.analyzeHabits).not.toHaveBeenCalled();
    });

    it('persists the row scoped to the requesting user, never another one', async () => {
      prisma.aiInsight.create.mockImplementation(
        ({ data }: { data: AiInsight }) => Promise.resolve(makeInsight(data)),
      );

      await service.generate(userId, { type: InsightType.PRODUCTIVITY });

      expect(prisma.aiInsight.create).toHaveBeenCalledWith(
        matching({ data: matching({ userId }) }),
      );
    });
  });

  describe('findAll — filtering and cross-user isolation', () => {
    it('scopes the query to the requesting user and defaults status to ACTIVE', async () => {
      await service.findAll(userId, {});

      expect(prisma.aiInsight.findMany).toHaveBeenCalledWith(
        matching({ where: matching({ userId, status: InsightStatus.ACTIVE }) }),
      );
    });

    it('filters by type when requested', async () => {
      await service.findAll(userId, { type: InsightType.GOALS });

      expect(prisma.aiInsight.findMany).toHaveBeenCalledWith(
        matching({ where: matching({ type: InsightType.GOALS }) }),
      );
    });

    it("never leaks another user's insights — a differently-scoped user gets its own where clause", async () => {
      await service.findAll(otherUserId, {});
      expect(prisma.aiInsight.findMany).toHaveBeenCalledWith(
        matching({ where: matching({ userId: otherUserId }) }),
      );
    });
  });

  describe('findOne — ownership', () => {
    it('returns 404 for an insight that exists but belongs to another user', async () => {
      prisma.aiInsight.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(userId, 'someone-elses-insight'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.aiInsight.findFirst).toHaveBeenCalledWith({
        where: { id: 'someone-elses-insight', userId },
      });
    });

    it('returns the insight when it belongs to the requesting user', async () => {
      prisma.aiInsight.findFirst.mockResolvedValue(makeInsight());
      const result = await service.findOne(userId, 'insight-1');
      expect(result.id).toBe('insight-1');
    });
  });
});
