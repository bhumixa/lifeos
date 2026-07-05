import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import {
  AiRole,
  type AiConversation,
  type AiMessage,
} from '../../../generated/prisma/index.js';
import {
  AiConversationResponseDto,
  AiConversationSummaryDto,
  AiMessageResponseDto,
  ChatResponseDto,
} from './dto/ai-conversation-response.dto.js';
import type { ChatRequestDto } from './dto/chat-request.dto.js';
import type { CreateConversationDto } from './dto/create-conversation.dto.js';
import { AiPromptService } from './ai-prompt.service.js';
import { AiProviderRegistry } from './providers/ai-provider.registry.js';

const DEFAULT_TITLE = 'New Conversation';
/** How many trailing messages are sent as conversation context to the provider — bounded so a
 * long-running conversation doesn't grow an unbounded prompt, the same "generous but bounded"
 * shape every other trend/lookback window in this codebase uses. */
const CHAT_HISTORY_LIMIT = 20;

/**
 * Owns AI Chat's turn-by-turn history. Ownership follows the same pattern as every other module:
 * every lookup is scoped by `userId`, and a conversation that exists but belongs to someone else is
 * a 404, not a 403. `AiMessage` has no owner column of its own — like RoutineStep/GoalMilestone,
 * it's only ever reached through its parent AiConversation, ownership enforced by joining
 * `conversation: { userId }`.
 *
 * `chat()` is the one method that calls out to an AiProvider — MockAiProvider today, per this
 * milestone's explicit instruction not to connect to a real one. Its reply is always persisted as
 * an ASSISTANT message and returned; nothing about a chat turn ever touches any other module's
 * data (no autonomous actions, per this milestone's business rules).
 */
@Injectable()
export class AiConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prompts: AiPromptService,
    private readonly providers: AiProviderRegistry,
  ) {}

  async findAll(userId: string): Promise<AiConversationSummaryDto[]> {
    const conversations = await this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });

    return conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: conversation._count.messages,
    }));
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<AiConversationResponseDto> {
    const conversation = await this.findConversationOrThrow(userId, id);
    return this.toResponse(conversation);
  }

  async create(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<AiConversationResponseDto> {
    const conversation = await this.prisma.aiConversation.create({
      data: { userId, title: dto.title ?? DEFAULT_TITLE },
      include: { messages: true },
    });
    return this.toResponse(conversation);
  }

  /** Resolves (or creates) the target conversation, persists the user's message, calls the active
   * AiProvider with the trailing history, and persists the assistant's reply — the only two writes
   * this service (or this whole module) ever performs are these two AiMessage rows plus the
   * conversation's own `updatedAt` bump. */
  async chat(userId: string, dto: ChatRequestDto): Promise<ChatResponseDto> {
    const conversation = dto.conversationId
      ? await this.findConversationOrThrow(userId, dto.conversationId)
      : await this.prisma.aiConversation.create({
          data: { userId, title: this.deriveTitle(dto.message) },
          include: { messages: true },
        });

    const userMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiRole.USER,
        content: dto.message,
      },
    });

    const history = [...conversation.messages, userMessage]
      .slice(-CHAT_HISTORY_LIMIT)
      .map((message) => ({ role: message.role, content: message.content }));
    const provider = this.providers.getActive();
    const result = await provider.chat(this.prompts.buildChatMessages(history));

    const assistantMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiRole.ASSISTANT,
        content: result.content,
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conversation.id,
      userMessage: this.toMessageResponse(userMessage),
      assistantMessage: this.toMessageResponse(assistantMessage),
    };
  }

  private deriveTitle(message: string): string {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return DEFAULT_TITLE;
    }
    return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  }

  private async findConversationOrThrow(
    userId: string,
    id: string,
  ): Promise<AiConversation & { messages: AiMessage[] }> {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private toResponse(
    conversation: AiConversation & { messages: AiMessage[] },
  ): AiConversationResponseDto {
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((message) =>
        this.toMessageResponse(message),
      ),
    };
  }

  private toMessageResponse(message: AiMessage): AiMessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    };
  }
}
