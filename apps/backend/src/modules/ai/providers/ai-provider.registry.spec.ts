import { InsightType } from '../../../../generated/prisma/index.js';
import { AnthropicProvider } from './anthropic.provider.js';
import { GoogleAiProvider } from './google-ai.provider.js';
import { AiProviderRegistry } from './ai-provider.registry.js';
import { MockAiProvider } from './mock-ai.provider.js';
import { OpenAiProvider } from './openai.provider.js';
import type { AiInsightContext, AiProvider } from './ai-provider.interface.js';

describe('AiProviderRegistry', () => {
  const mock = new MockAiProvider();
  const openai = new OpenAiProvider();
  const anthropic = new AnthropicProvider();
  const google = new GoogleAiProvider();
  const registry = new AiProviderRegistry(mock, openai, anthropic, google);

  it('resolves every provider name to its own adapter instance', () => {
    expect(registry.resolve('MOCK')).toBe(mock);
    expect(registry.resolve('OPENAI')).toBe(openai);
    expect(registry.resolve('ANTHROPIC')).toBe(anthropic);
    expect(registry.resolve('GOOGLE')).toBe(google);
  });

  it('getActive always returns MockAiProvider — no real provider is wired up in this milestone', () => {
    expect(registry.getActive()).toBe(mock);
    expect(registry.getActive().name).toBe('MOCK');
  });
});

const INSIGHT_METHODS = [
  'generateInsight',
  'analyzeHabits',
  'analyzeGoals',
  'analyzePlanner',
  'analyzeJournal',
] as const satisfies readonly (keyof AiProvider)[];

describe.each<[string, AiProvider]>([
  ['OpenAiProvider', new OpenAiProvider()],
  ['AnthropicProvider', new AnthropicProvider()],
  ['GoogleAiProvider', new GoogleAiProvider()],
])('%s (placeholder)', (_label, provider) => {
  const context: AiInsightContext = {
    type: InsightType.PRODUCTIVITY,
    prompt: 'p',
    sourceData: {},
  };

  it('never connects to a real API — every insight method resolves to an explicit NOT_IMPLEMENTED result', async () => {
    for (const method of INSIGHT_METHODS) {
      const result = await provider[method](context);
      expect(result.confidence).toBe(0);
      expect(result.content).toContain('NOT_IMPLEMENTED');
    }
  });

  it('chat never throws and never silently no-ops', async () => {
    const result = await provider.chat([{ role: 'USER', content: 'hello' }]);
    expect(result.content).toContain('NOT_IMPLEMENTED');
  });
});
