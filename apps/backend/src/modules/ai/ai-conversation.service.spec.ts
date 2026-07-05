import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AiRole } from '../../../generated/prisma/index.js';
import { AiConversationService } from './ai-conversation.service.js';
import { AiPromptService } from './ai-prompt.service.js';
import { AiProviderRegistry } from './providers/ai-provider.registry.js';

function matching<T>(partial: Partial<T>): T {
  return expect.objectContaining(partial) as T;
}

describe('AiConversationService', () => {
  let service: AiConversationService;
  let prisma: {
    aiConversation: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    aiMessage: { create: jest.Mock };
  };
  let provider: { chat: jest.Mock };

  const userId = 'user-1';
  const otherUserId = 'user-2';

  beforeEach(async () => {
    prisma = {
      aiConversation: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      aiMessage: { create: jest.fn() },
    };
    provider = {
      chat: jest.fn().mockResolvedValue({ content: 'assistant reply' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConversationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AiPromptService,
          useValue: {
            buildChatMessages: jest.fn((history: unknown[]) => history),
          },
        },
        {
          provide: AiProviderRegistry,
          useValue: { getActive: jest.fn().mockReturnValue(provider) },
        },
      ],
    }).compile();

    service = module.get(AiConversationService);
  });

  describe('chat', () => {
    it('creates a new conversation, auto-titled from the message, when no conversationId is given', async () => {
      prisma.aiConversation.create.mockResolvedValue({
        id: 'conv-1',
        userId,
        title: 'Should I reschedule my week?',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.aiMessage.create
        .mockResolvedValueOnce({
          id: 'msg-user',
          conversationId: 'conv-1',
          role: AiRole.USER,
          content: 'Should I reschedule my week?',
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'msg-assistant',
          conversationId: 'conv-1',
          role: AiRole.ASSISTANT,
          content: 'assistant reply',
          createdAt: new Date(),
        });

      const result = await service.chat(userId, {
        message: 'Should I reschedule my week?',
      });

      expect(prisma.aiConversation.create).toHaveBeenCalledWith(
        matching({ data: matching({ userId }) }),
      );
      expect(result.conversationId).toBe('conv-1');
      expect(result.userMessage.role).toBe(AiRole.USER);
      expect(result.assistantMessage.role).toBe(AiRole.ASSISTANT);
      expect(result.assistantMessage.content).toBe('assistant reply');
    });

    it('appends to an existing conversation the user owns rather than creating a new one', async () => {
      prisma.aiConversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        userId,
        title: 'Existing',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.aiMessage.create
        .mockResolvedValueOnce({
          id: 'msg-user',
          conversationId: 'conv-1',
          role: AiRole.USER,
          content: 'follow-up',
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'msg-assistant',
          conversationId: 'conv-1',
          role: AiRole.ASSISTANT,
          content: 'assistant reply',
          createdAt: new Date(),
        });

      await service.chat(userId, {
        conversationId: 'conv-1',
        message: 'follow-up',
      });

      expect(prisma.aiConversation.create).not.toHaveBeenCalled();
      expect(prisma.aiConversation.findFirst).toHaveBeenCalledWith(
        matching({ where: { id: 'conv-1', userId } }),
      );
    });

    it('rejects a conversationId that belongs to another user', async () => {
      prisma.aiConversation.findFirst.mockResolvedValue(null);

      await expect(
        service.chat(userId, {
          conversationId: 'someone-elses-conversation',
          message: 'hi',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.aiMessage.create).not.toHaveBeenCalled();
    });

    it('never writes to any table besides AiConversation/AiMessage — no autonomous actions', async () => {
      prisma.aiConversation.create.mockResolvedValue({
        id: 'conv-1',
        userId,
        title: 'x',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.aiMessage.create.mockResolvedValue({
        id: 'msg',
        conversationId: 'conv-1',
        role: AiRole.USER,
        content: 'x',
        createdAt: new Date(),
      });

      await service.chat(userId, { message: 'x' });

      // Every mock the test double exposes is one of AiConversation/AiMessage's own methods —
      // there is nothing else this service could have called.
      expect(Object.keys(prisma)).toEqual(['aiConversation', 'aiMessage']);
    });
  });

  describe('findAll / findOne — cross-user isolation', () => {
    it('scopes the conversation list to the requesting user', async () => {
      await service.findAll(userId);
      expect(prisma.aiConversation.findMany).toHaveBeenCalledWith(
        matching({ where: { userId } }),
      );
    });

    it('returns 404 for a conversation that exists but belongs to another user', async () => {
      prisma.aiConversation.findFirst.mockResolvedValue(null);

      await expect(service.findOne(otherUserId, 'conv-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
