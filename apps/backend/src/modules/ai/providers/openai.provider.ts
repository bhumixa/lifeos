import { Injectable } from '@nestjs/common';
import { PlaceholderAiProvider } from './placeholder-ai.provider.js';

/** Placeholder adapter — see the class doc on PlaceholderAiProvider. A future milestone wires this
 * to the real OpenAI API (per docs/08-tech-stack.md's "secondary/fallback provider" role). */
@Injectable()
export class OpenAiProvider extends PlaceholderAiProvider {
  readonly name = 'OPENAI' as const;
  protected readonly displayName = 'OpenAI';
}
