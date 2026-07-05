import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { AiConversationSummary } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

/** The AI Chat page's conversation sidebar — list + "new conversation" action. Purely
 * presentational, the same role NotificationList plays for Notification Center. */
@Component({
  selector: 'app-conversation-list',
  imports: [MatButtonModule, MatIconModule, EmptyState],
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.scss',
})
export class ConversationList {
  readonly conversations = input.required<AiConversationSummary[]>();
  readonly activeId = input<string | null>(null);

  readonly selected = output<string>();
  readonly newConversation = output<void>();
}
