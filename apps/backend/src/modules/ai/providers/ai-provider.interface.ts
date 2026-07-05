import type {
  AiRole,
  InsightType,
} from '../../../../generated/prisma/index.js';

/** What AiAnalysisService hands a provider for one insight-generation call — `sourceData` is the
 * metrics already computed from Task/Habit/Goal/Planner/Journal/Streak/Notification data (see
 * utils/ai-metrics.util.ts), `prompt` is the natural-language instruction a real LLM provider would
 * send alongside it (see AiPromptService). MockAiProvider only ever reads `sourceData` — `prompt`
 * exists for the three unimplemented providers to eventually forward to a real completion API. */
export interface AiInsightContext {
  type: InsightType;
  prompt: string;
  sourceData: Record<string, unknown>;
}

export interface AiInsightResult {
  title: string;
  summary: string;
  content: string;
  /** 0.0-1.0, self-reported by the provider — see the class doc on AiInsight in
   * prisma/schema.prisma. */
  confidence: number;
}

export interface AiChatMessageInput {
  role: AiRole;
  content: string;
}

export interface AiChatResult {
  content: string;
}

export type AiProviderName = 'MOCK' | 'OPENAI' | 'ANTHROPIC' | 'GOOGLE';

/**
 * The seam every AI backend (mock or real) implements — AiInsightsService/AiConversationService
 * depend only on this interface, never on a concrete provider, via AiProviderRegistry. Mirrors the
 * shape ICalendarProvider/INotificationChannel already established: one small interface, a registry
 * keyed by name, and adapters that are safe to call even when unimplemented.
 *
 * `analyzeHabits`/`analyzeGoals`/`analyzePlanner`/`analyzeJournal` are the four domains this
 * milestone gives a dedicated method (matching InsightType's HABITS/GOALS/PLANNER/JOURNAL values
 * one-to-one); `generateInsight` is the general-purpose entry point used for the cross-cutting
 * PRODUCTIVITY/STREAKS/SYSTEM types, which don't correspond to a single owning domain — see
 * AiAnalysisService for how a requested InsightType is routed to one or the other.
 */
export interface AiProvider {
  readonly name: AiProviderName;
  generateInsight(context: AiInsightContext): Promise<AiInsightResult>;
  analyzeHabits(context: AiInsightContext): Promise<AiInsightResult>;
  analyzeGoals(context: AiInsightContext): Promise<AiInsightResult>;
  analyzePlanner(context: AiInsightContext): Promise<AiInsightResult>;
  analyzeJournal(context: AiInsightContext): Promise<AiInsightResult>;
  chat(messages: AiChatMessageInput[]): Promise<AiChatResult>;
}
