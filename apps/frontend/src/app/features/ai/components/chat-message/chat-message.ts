import { Component, input } from '@angular/core';
import type { AiMessage } from '@lifeos/shared-types';

/** One chat bubble — used by ChatWindow to render both USER and ASSISTANT turns. SYSTEM messages
 * (the chat system prompt AiPromptService prepends server-side) are never part of a conversation's
 * own persisted `messages` array, so this component only ever renders USER/ASSISTANT. */
@Component({
  selector: 'app-chat-message',
  templateUrl: './chat-message.html',
  styleUrl: './chat-message.scss',
})
export class ChatMessage {
  readonly message = input.required<AiMessage>();

  protected get isUser(): boolean {
    return this.message().role === 'USER';
  }
}
