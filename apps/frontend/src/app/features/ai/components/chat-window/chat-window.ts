import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import type { AiMessage } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ChatMessage } from '../chat-message/chat-message';

/** The AI Chat page's message list + composer. Purely presentational — AiChatPage owns loading
 * the active conversation and calling AiConversationsStore.send(); this component only emits when
 * the user submits a message. */
@Component({
  selector: 'app-chat-window',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, EmptyState, ChatMessage],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss',
})
export class ChatWindow {
  readonly messages = input.required<AiMessage[]>();
  readonly sending = input(false);

  readonly sent = output<string>();

  protected draft = signal('');

  protected submit(): void {
    const text = this.draft().trim();
    if (!text || this.sending()) {
      return;
    }
    this.sent.emit(text);
    this.draft.set('');
  }
}
