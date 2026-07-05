import { Injectable } from '@nestjs/common';
import { InsightType } from '../../../../generated/prisma/index.js';
import {
  buildChatReply,
  buildGoalsInsight,
  buildHabitsInsight,
  buildJournalInsight,
  buildPlannerInsight,
  buildProductivityInsight,
  buildStreaksInsight,
  buildSystemInsight,
  type GoalsSourceData,
  type HabitsSourceData,
  type JournalSourceData,
  type PlannerSourceData,
  type ProductivitySourceData,
  type StreaksSourceData,
} from '../utils/insight-templates.util.js';
import type {
  AiChatMessageInput,
  AiChatResult,
  AiInsightContext,
  AiInsightResult,
  AiProvider,
} from './ai-provider.interface.js';

/**
 * The only provider that "does anything real" today — the same role LocalCalendarProvider/
 * InAppChannel play among their own siblings. It never calls an external API; it deterministically
 * formats the metrics AiAnalysisService already computed (see utils/ai-metrics.util.ts) into
 * readable text via utils/insight-templates.util.ts. This is what this milestone's "analysis
 * engine" actually is: real statistical analysis over the user's own data, presented through a
 * provider-shaped seam so a real LLM can drop in later without AiInsightsService/
 * AiConversationService changing at all.
 */
@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'MOCK' as const;

  generateInsight(context: AiInsightContext): Promise<AiInsightResult> {
    switch (context.type) {
      case InsightType.PRODUCTIVITY:
        return Promise.resolve(
          buildProductivityInsight(
            context.sourceData as unknown as ProductivitySourceData,
          ),
        );
      case InsightType.STREAKS:
        return Promise.resolve(
          buildStreaksInsight(
            context.sourceData as unknown as StreaksSourceData,
          ),
        );
      default:
        return Promise.resolve(
          buildSystemInsight(
            (context.sourceData.reason as string) ??
              'Not enough data yet to generate this insight.',
          ),
        );
    }
  }

  analyzeHabits(context: AiInsightContext): Promise<AiInsightResult> {
    return Promise.resolve(
      buildHabitsInsight(context.sourceData as unknown as HabitsSourceData),
    );
  }

  analyzeGoals(context: AiInsightContext): Promise<AiInsightResult> {
    return Promise.resolve(
      buildGoalsInsight(context.sourceData as unknown as GoalsSourceData),
    );
  }

  analyzePlanner(context: AiInsightContext): Promise<AiInsightResult> {
    return Promise.resolve(
      buildPlannerInsight(context.sourceData as unknown as PlannerSourceData),
    );
  }

  analyzeJournal(context: AiInsightContext): Promise<AiInsightResult> {
    return Promise.resolve(
      buildJournalInsight(context.sourceData as unknown as JournalSourceData),
    );
  }

  chat(messages: AiChatMessageInput[]): Promise<AiChatResult> {
    return Promise.resolve({ content: buildChatReply(messages) });
  }
}
