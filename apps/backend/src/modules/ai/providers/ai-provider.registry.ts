import { Injectable } from '@nestjs/common';
import { AnthropicProvider } from './anthropic.provider.js';
import { GoogleAiProvider } from './google-ai.provider.js';
import { MockAiProvider } from './mock-ai.provider.js';
import { OpenAiProvider } from './openai.provider.js';
import type { AiProvider, AiProviderName } from './ai-provider.interface.js';

/**
 * Maps an AiProviderName to the adapter that implements it — the single place
 * AiInsightsService/AiConversationService need to know every concrete provider class exists, the
 * same data-driven-catalog role CalendarProviderRegistry/NotificationChannelRegistry already play
 * for their own adapters. Adding a fifth provider later means adding one line here.
 */
@Injectable()
export class AiProviderRegistry {
  private readonly providers: Record<AiProviderName, AiProvider>;

  constructor(
    mock: MockAiProvider,
    openai: OpenAiProvider,
    anthropic: AnthropicProvider,
    google: GoogleAiProvider,
  ) {
    this.providers = {
      MOCK: mock,
      OPENAI: openai,
      ANTHROPIC: anthropic,
      GOOGLE: google,
    };
  }

  resolve(name: AiProviderName): AiProvider {
    return this.providers[name];
  }

  /** The provider every insight/chat call actually uses today. Hardcoded to MOCK — per this
   * milestone's explicit "do not connect to real OpenAI, Anthropic, or Google AI" instruction,
   * there is no env-driven provider selection yet. Swapping the active provider later (once a real
   * one is wired up) is a one-line change here, not a change to any caller. */
  getActive(): AiProvider {
    return this.providers.MOCK;
  }
}
