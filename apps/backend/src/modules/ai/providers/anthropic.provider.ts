import { Injectable } from '@nestjs/common';
import { PlaceholderAiProvider } from './placeholder-ai.provider.js';

/** Placeholder adapter — see the class doc on PlaceholderAiProvider. A future milestone wires this
 * to the real Claude API (per docs/08-tech-stack.md's "primary — coaching tone" role). */
@Injectable()
export class AnthropicProvider extends PlaceholderAiProvider {
  readonly name = 'ANTHROPIC' as const;
  protected readonly displayName = 'Anthropic Claude';
}
