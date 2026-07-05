import { Test, TestingModule } from '@nestjs/testing';
import { AiConversationService } from './ai-conversation.service.js';
import { AiInsightsService } from './ai-insights.service.js';
import { AiController } from './ai.controller.js';

describe('AiController', () => {
  let controller: AiController;
  let insightsService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    generate: jest.Mock;
  };
  let conversationService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    chat: jest.Mock;
  };

  const user = { id: 'user-1', email: 'a@b.com', role: 'STANDARD' } as const;

  beforeEach(async () => {
    insightsService = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ id: 'insight-1' }),
      generate: jest.fn().mockResolvedValue([{ id: 'insight-1' }]),
    };
    conversationService = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      create: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      chat: jest.fn().mockResolvedValue({ conversationId: 'conv-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiInsightsService, useValue: insightsService },
        { provide: AiConversationService, useValue: conversationService },
      ],
    }).compile();

    controller = module.get(AiController);
  });

  it('GET /ai/insights delegates to AiInsightsService.findAll scoped to the current user', async () => {
    await controller.findInsights(user, {});
    expect(insightsService.findAll).toHaveBeenCalledWith(user.id, {});
  });

  it('GET /ai/insights/:id delegates to AiInsightsService.findOne', async () => {
    await controller.findInsight(user, 'insight-1');
    expect(insightsService.findOne).toHaveBeenCalledWith(user.id, 'insight-1');
  });

  it('POST /ai/insights/generate delegates to AiInsightsService.generate', async () => {
    await controller.generateInsights(user, {});
    expect(insightsService.generate).toHaveBeenCalledWith(user.id, {});
  });

  it('POST /ai/chat delegates to AiConversationService.chat', async () => {
    await controller.chat(user, { message: 'hi' });
    expect(conversationService.chat).toHaveBeenCalledWith(user.id, {
      message: 'hi',
    });
  });

  it('GET /ai/conversations delegates to AiConversationService.findAll', async () => {
    await controller.findConversations(user);
    expect(conversationService.findAll).toHaveBeenCalledWith(user.id);
  });

  it('GET /ai/conversations/:id delegates to AiConversationService.findOne', async () => {
    await controller.findConversation(user, 'conv-1');
    expect(conversationService.findOne).toHaveBeenCalledWith(user.id, 'conv-1');
  });

  it('POST /ai/conversations delegates to AiConversationService.create', async () => {
    await controller.createConversation(user, {});
    expect(conversationService.create).toHaveBeenCalledWith(user.id, {});
  });
});
