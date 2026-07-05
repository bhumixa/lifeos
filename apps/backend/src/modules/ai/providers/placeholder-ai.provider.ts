import type {
  AiChatResult,
  AiInsightResult,
  AiProvider,
  AiProviderName,
} from './ai-provider.interface.js';

/**
 * Shared placeholder behavior for every not-yet-integrated real provider. Per this milestone's own
 * instructions ("Do NOT connect to real OpenAI/Anthropic/Google. Only implement the architecture."),
 * OpenAiProvider/AnthropicProvider/GoogleAiProvider all extend this rather than each hand-writing
 * the same "not implemented" result — the exact shape PlaceholderNotificationChannel already
 * established for Notifications' own not-yet-built channels. Never throws and never silently
 * no-ops: every method resolves to an explicit, clearly-labeled NOT_IMPLEMENTED result. A future
 * milestone that wires up a real provider deletes that one subclass's inheritance from this base and
 * gives it real method bodies — the other two stay untouched.
 */
export abstract class PlaceholderAiProvider implements AiProvider {
  abstract readonly name: AiProviderName;
  protected abstract readonly displayName: string;

  generateInsight(): Promise<AiInsightResult> {
    return Promise.resolve(this.notImplementedInsight());
  }

  analyzeHabits(): Promise<AiInsightResult> {
    return Promise.resolve(this.notImplementedInsight());
  }

  analyzeGoals(): Promise<AiInsightResult> {
    return Promise.resolve(this.notImplementedInsight());
  }

  analyzePlanner(): Promise<AiInsightResult> {
    return Promise.resolve(this.notImplementedInsight());
  }

  analyzeJournal(): Promise<AiInsightResult> {
    return Promise.resolve(this.notImplementedInsight());
  }

  chat(): Promise<AiChatResult> {
    return Promise.resolve({
      content: `NOT_IMPLEMENTED: ${this.displayName} chat is not yet implemented — a future milestone integrates a real provider.`,
    });
  }

  private notImplementedInsight(): AiInsightResult {
    return {
      title: 'Provider not available',
      summary: `${this.displayName} integration is not yet implemented.`,
      content: `NOT_IMPLEMENTED: ${this.displayName} is not yet implemented — a future milestone integrates a real provider.`,
      confidence: 0,
    };
  }
}
