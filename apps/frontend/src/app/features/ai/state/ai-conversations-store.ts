import { Injectable, computed, inject, signal } from '@angular/core';
import type { AiConversation, AiConversationSummary } from '@lifeos/shared-types';
import { AiApiService } from '../services/ai-api.service';

/** Owns AI Chat's conversation list plus whichever single conversation is currently open — the
 * same "one store, list + active detail" shape PlannerStore already establishes for its own
 * currently-viewed day. `providedIn: 'root'` so the Conversation List sidebar and the active Chat
 * Window can share one source of truth, the same reason NotificationsStore is root-scoped rather
 * than page-scoped. */
@Injectable({ providedIn: 'root' })
export class AiConversationsStore {
  private readonly api = inject(AiApiService);

  private readonly conversationsSignal = signal<AiConversationSummary[]>([]);
  private readonly conversationsLoadingSignal = signal(false);

  private readonly activeConversationSignal = signal<AiConversation | null>(null);
  private readonly activeLoadingSignal = signal(false);
  private readonly sendingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly conversations = this.conversationsSignal.asReadonly();
  readonly conversationsLoading = this.conversationsLoadingSignal.asReadonly();
  readonly activeConversation = this.activeConversationSignal.asReadonly();
  readonly activeLoading = this.activeLoadingSignal.asReadonly();
  readonly sending = this.sendingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly messages = computed(() => this.activeConversationSignal()?.messages ?? []);

  loadConversations(): void {
    this.conversationsLoadingSignal.set(true);
    this.api.listConversations().subscribe({
      next: (conversations) => {
        this.conversationsSignal.set(conversations);
        this.conversationsLoadingSignal.set(false);
      },
      error: () => this.conversationsLoadingSignal.set(false),
    });
  }

  openConversation(id: string): void {
    this.activeLoadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getConversation(id).subscribe({
      next: (conversation) => {
        this.activeConversationSignal.set(conversation);
        this.activeLoadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load that conversation.');
        this.activeLoadingSignal.set(false);
      },
    });
  }

  startNewConversation(): void {
    this.activeConversationSignal.set(null);
  }

  /** Sends a message in the currently-open conversation, or starts a new one if none is open —
   * the same "omitting conversationId starts a new one" contract POST /ai/chat implements. */
  send(message: string): void {
    this.sendingSignal.set(true);
    this.errorSignal.set(null);
    const conversationId = this.activeConversationSignal()?.id;

    this.api.chat({ conversationId, message }).subscribe({
      next: (result) => {
        const current = this.activeConversationSignal();
        if (current && current.id === result.conversationId) {
          this.activeConversationSignal.set({
            ...current,
            messages: [...current.messages, result.userMessage, result.assistantMessage],
          });
        } else {
          this.openConversation(result.conversationId);
        }
        this.sendingSignal.set(false);
        this.loadConversations();
      },
      error: () => {
        this.errorSignal.set('Could not send that message. Please try again.');
        this.sendingSignal.set(false);
      },
    });
  }
}
