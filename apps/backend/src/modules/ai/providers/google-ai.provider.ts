import { Injectable } from '@nestjs/common';
import { PlaceholderAiProvider } from './placeholder-ai.provider.js';

/** Placeholder adapter — see the class doc on PlaceholderAiProvider. A future milestone wires this
 * to a real Google AI (Gemini) integration, should one ever be added alongside Claude/OpenAI. */
@Injectable()
export class GoogleAiProvider extends PlaceholderAiProvider {
  readonly name = 'GOOGLE' as const;
  protected readonly displayName = 'Google AI';
}
