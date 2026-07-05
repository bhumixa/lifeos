import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatWindow } from '../../components/chat-window/chat-window';
import { ConversationList } from '../../components/conversation-list/conversation-list';
import { AiConversationsStore } from '../../state/ai-conversations-store';

/** AI Chat — a conversation sidebar (ConversationList) plus the active conversation's message
 * history and composer (ChatWindow). `:conversationId` is optional — visiting `/ai-coach/chat`
 * directly starts a fresh conversation; visiting `/ai-coach/chat/:conversationId` opens that one,
 * the same "route param opens a specific existing entity" shape Journal Detail's `:date/:id`
 * already uses. */
@Component({
  selector: 'app-ai-chat-page',
  imports: [ConversationList, ChatWindow],
  templateUrl: './ai-chat-page.html',
  styleUrl: './ai-chat-page.scss',
})
export class AiChatPage implements OnInit {
  private readonly store = inject(AiConversationsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly conversations = this.store.conversations;
  protected readonly activeConversation = this.store.activeConversation;
  protected readonly messages = this.store.messages;
  protected readonly sending = this.store.sending;
  protected readonly error = this.store.error;

  ngOnInit(): void {
    this.store.loadConversations();
    const conversationId = this.route.snapshot.paramMap.get('conversationId');
    if (conversationId) {
      this.store.openConversation(conversationId);
    }
  }

  protected select(id: string): void {
    void this.router.navigate(['/ai-coach/chat', id]);
    this.store.openConversation(id);
  }

  protected startNew(): void {
    void this.router.navigate(['/ai-coach/chat']);
    this.store.startNewConversation();
  }

  protected send(message: string): void {
    this.store.send(message);
  }
}
