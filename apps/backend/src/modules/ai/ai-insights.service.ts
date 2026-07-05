import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  InsightStatus,
  InsightType,
  Prisma,
  type AiInsight,
} from '../../../generated/prisma/index.js';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface.js';
import { AiAnalysisService } from './ai-analysis.service.js';
import { AiPromptService } from './ai-prompt.service.js';
import type { AiInsightResponseDto } from './dto/ai-insight-response.dto.js';
import type { GenerateInsightDto } from './dto/generate-insight.dto.js';
import type { ListInsightsQueryDto } from './dto/list-insights-query.dto.js';
import { AiProviderRegistry } from './providers/ai-provider.registry.js';
import type {
  AiInsightContext,
  AiProvider,
} from './providers/ai-provider.interface.js';

/** Every domain POST /ai/insights/generate produces when `type` is omitted — SYSTEM is excluded
 * (it's a general coaching note with no domain data of its own, reserved for a future explicit
 * use, not something auto-generated alongside the other six). */
const DEFAULT_GENERATE_TYPES: InsightType[] = [
  InsightType.PRODUCTIVITY,
  InsightType.HABITS,
  InsightType.GOALS,
  InsightType.PLANNER,
  InsightType.JOURNAL,
  InsightType.STREAKS,
];

/** How long a freshly generated insight is considered current — a documented default, not
 * enforced by any expiry job (no such job exists in this codebase — see docs/05-architecture.md's
 * Background Processing section). `GET /ai/insights` doesn't filter out expired rows automatically
 * either; `expiresAt` is informational until a future milestone adds that behavior. */
const INSIGHT_TTL_HOURS = 24;

/**
 * Orchestrates insight generation and read access. Strictly read-only with respect to every other
 * module's own domain data — the only writes this service ever performs are to its own AiInsight
 * table. Ownership follows the same pattern as every other module: every lookup is scoped by
 * `userId`, and an insight that exists but belongs to someone else is a 404, not a 403.
 */
@Injectable()
export class AiInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analysis: AiAnalysisService,
    private readonly prompts: AiPromptService,
    private readonly providers: AiProviderRegistry,
  ) {}

  async findAll(
    userId: string,
    query: ListInsightsQueryDto,
  ): Promise<PaginatedResult<AiInsightResponseDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'generatedAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.AiInsightWhereInput = {
      userId,
      status: query.status ?? InsightStatus.ACTIVE,
      ...(query.type && { type: query.type }),
    };

    const [insights, total] = await Promise.all([
      this.prisma.aiInsight.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiInsight.count({ where }),
    ]);

    return {
      data: insights.map((insight) => this.toResponse(insight)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<AiInsightResponseDto> {
    const insight = await this.prisma.aiInsight.findFirst({
      where: { id, userId },
    });
    if (!insight) {
      throw new NotFoundException('Insight not found');
    }
    return this.toResponse(insight);
  }

  /** Generates and persists one insight per requested type (or every auto-generatable type — see
   * DEFAULT_GENERATE_TYPES — if none was given). Each type's metrics come from
   * AiAnalysisService's own read-only composition of Tasks/Habits/Planner/Streaks/Goals/Journal/
   * Notifications; nothing here writes to any of those modules' tables. */
  async generate(
    userId: string,
    dto: GenerateInsightDto,
  ): Promise<AiInsightResponseDto[]> {
    const types = dto.type ? [dto.type] : DEFAULT_GENERATE_TYPES;
    const provider = this.providers.getActive();

    const created: AiInsightResponseDto[] = [];
    for (const type of types) {
      created.push(await this.generateOne(userId, type, provider));
    }
    return created;
  }

  private async generateOne(
    userId: string,
    type: InsightType,
    provider: AiProvider,
  ): Promise<AiInsightResponseDto> {
    const sourceData = await this.analysis.computeSourceData(userId, type);
    const prompt = this.prompts.buildInsightPrompt(type, sourceData);
    const context: AiInsightContext = { type, prompt, sourceData };
    const result = await this.dispatch(provider, type, context);

    const generatedAt = new Date();
    const insight = await this.prisma.aiInsight.create({
      data: {
        userId,
        type,
        title: result.title,
        summary: result.summary,
        content: result.content,
        confidence: result.confidence,
        sourceData: sourceData as Prisma.InputJsonValue,
        generatedAt,
        expiresAt: new Date(
          generatedAt.getTime() + INSIGHT_TTL_HOURS * 3_600_000,
        ),
      },
    });

    return this.toResponse(insight);
  }

  /** Routes a requested InsightType to the provider method that owns it — see the class doc on
   * AiProvider for why HABITS/GOALS/PLANNER/JOURNAL get a dedicated method and
   * PRODUCTIVITY/STREAKS/SYSTEM share the general-purpose `generateInsight`. */
  private dispatch(
    provider: AiProvider,
    type: InsightType,
    context: AiInsightContext,
  ): ReturnType<AiProvider['generateInsight']> {
    switch (type) {
      case InsightType.HABITS:
        return provider.analyzeHabits(context);
      case InsightType.GOALS:
        return provider.analyzeGoals(context);
      case InsightType.PLANNER:
        return provider.analyzePlanner(context);
      case InsightType.JOURNAL:
        return provider.analyzeJournal(context);
      default:
        return provider.generateInsight(context);
    }
  }

  private toResponse(insight: AiInsight): AiInsightResponseDto {
    return {
      id: insight.id,
      type: insight.type,
      title: insight.title,
      summary: insight.summary,
      content: insight.content,
      confidence: insight.confidence,
      status: insight.status,
      sourceData:
        (insight.sourceData as Record<string, unknown> | null) ?? null,
      generatedAt: insight.generatedAt,
      expiresAt: insight.expiresAt,
      createdAt: insight.createdAt,
    };
  }
}
