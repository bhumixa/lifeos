import { Injectable } from '@nestjs/common';
import { InsightType } from '../../../generated/prisma/index.js';
import type { AiChatMessageInput } from './providers/ai-provider.interface.js';

/**
 * Builds the natural-language instruction a real LLM provider would send alongside
 * AiAnalysisService's computed metrics (see AiInsightContext.prompt). MockAiProvider never reads
 * this text — it formats structured `sourceData` directly (see utils/insight-templates.util.ts) —
 * but the prompt is still built and attached to every call, so wiring up OpenAiProvider/
 * AnthropicProvider/GoogleAiProvider later means giving them a real HTTP call using this exact
 * text, not redesigning how insights/chat are requested.
 *
 * Every prompt repeats the same safety framing this milestone's business rules require: read-only,
 * advisory-only, no claim of having taken or being able to take any action.
 */
@Injectable()
export class AiPromptService {
  private static readonly SAFETY_PREFIX =
    "You are a personal productivity coach analyzing a user's own task, habit, goal, planner, " +
    'journal, and streak data. You are strictly read-only: you never claim to modify, delete, or ' +
    'act on anything. Every response is an advisory suggestion the user may act on themselves, ' +
    'never an automated action.';

  buildInsightPrompt(
    type: InsightType,
    sourceData: Record<string, unknown>,
  ): string {
    const instruction = this.instructionFor(type);
    return `${AiPromptService.SAFETY_PREFIX}\n\n${instruction}\n\nData:\n${JSON.stringify(sourceData)}`;
  }

  buildChatSystemPrompt(): string {
    return (
      `${AiPromptService.SAFETY_PREFIX}\n\n` +
      "Answer the user's question conversationally, referencing their own data only in general " +
      'terms unless a specific figure was given to you. Recommend they generate a fresh AI Coach ' +
      'insight for detailed, data-backed analysis.'
    );
  }

  /** Prepends the chat system prompt as a SYSTEM-role message ahead of the conversation history —
   * the shape every chat-completion API (OpenAI/Anthropic/Google) expects a system instruction in. */
  buildChatMessages(history: AiChatMessageInput[]): AiChatMessageInput[] {
    return [
      { role: 'SYSTEM', content: this.buildChatSystemPrompt() },
      ...history,
    ];
  }

  private instructionFor(type: InsightType): string {
    switch (type) {
      case InsightType.PRODUCTIVITY:
        return "Summarize this week's productivity trend versus last week, and name the most productive weekday(s) if the data shows one.";
      case InsightType.HABITS:
        return "Summarize today's habit consistency and note whether habits are completed more often at a particular time of day.";
      case InsightType.GOALS:
        return 'Identify any active goal at risk of missing its target date, comparing actual progress to expected progress.';
      case InsightType.PLANNER:
        return "Summarize this week's planner block completion rate versus last week, and suggest one concrete scheduling adjustment if it has dropped.";
      case InsightType.JOURNAL:
        return 'Summarize the recent trend in journaled mood, noting any multi-day improving or declining streak.';
      case InsightType.STREAKS:
        return "Summarize the user's current habit streak status, including whether today is already successful.";
      case InsightType.SYSTEM:
        return 'Provide a general coaching note given the available data.';
    }
  }
}
