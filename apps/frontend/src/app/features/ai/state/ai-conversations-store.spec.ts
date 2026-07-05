import { TestBed } from '@angular/core/testing';
import type { AiConversation, AiConversationSummary } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { AiApiService } from '../services/ai-api.service';
import { AiConversationsStore } from './ai-conversations-store';

describe('AiConversationsStore', () => {
  let store: AiConversationsStore;
  let api: {
    listConversations: jasmine.Spy;
    getConversation: jasmine.Spy;
    chat: jasmine.Spy;
  };

  const mockSummary: AiConversationSummary = {
    id: 'conv-1',
    title: 'Should I reschedule my week?',
    createdAt: '2026-07-05T08:00:00.000Z',
    updatedAt: '2026-07-05T08:00:00.000Z',
    messageCount: 2,
  };

  const mockConversation: AiConversation = {
    id: 'conv-1',
    title: 'Should I reschedule my week?',
    createdAt: '2026-07-05T08:00:00.000Z',
    updatedAt: '2026-07-05T08:00:00.000Z',
    messages: [
      { id: 'm1', conversationId: 'conv-1', role: 'USER', content: 'hi', createdAt: '2026-07-05T08:00:00.000Z' },
      { id: 'm2', conversationId: 'conv-1', role: 'ASSISTANT', content: 'hello', createdAt: '2026-07-05T08:00:00.000Z' },
    ],
  };

  beforeEach(() => {
    api = {
      listConversations: jasmine.createSpy('listConversations').and.returnValue(of([mockSummary])),
      getConversation: jasmine.createSpy('getConversation').and.returnValue(of(mockConversation)),
      chat: jasmine.createSpy('chat').and.returnValue(
        of({
          conversationId: 'conv-1',
          userMessage: mockConversation.messages[0],
          assistantMessage: mockConversation.messages[1],
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AiApiService, useValue: api }],
    });

    store = TestBed.inject(AiConversationsStore);
  });

  it('starts with no active conversation and no messages', () => {
    expect(store.activeConversation()).toBeNull();
    expect(store.messages()).toEqual([]);
  });

  it('loadConversations() populates the conversation list', () => {
    store.loadConversations();
    expect(store.conversations()).toEqual([mockSummary]);
  });

  it('openConversation() loads and sets the active conversation', () => {
    store.openConversation('conv-1');
    expect(api.getConversation).toHaveBeenCalledWith('conv-1');
    expect(store.activeConversation()).toEqual(mockConversation);
    expect(store.messages()).toEqual(mockConversation.messages);
  });

  it('startNewConversation() clears the active conversation', () => {
    store.openConversation('conv-1');
    store.startNewConversation();
    expect(store.activeConversation()).toBeNull();
  });

  it('send() with no active conversation omits conversationId and opens the returned one', () => {
    store.send('hi');

    expect(api.chat).toHaveBeenCalledWith({ conversationId: undefined, message: 'hi' });
    expect(api.getConversation).toHaveBeenCalledWith('conv-1');
    expect(store.sending()).toBe(false);
  });

  it('send() in an already-open conversation appends both messages locally without refetching it', () => {
    store.openConversation('conv-1');
    api.getConversation.calls.reset();

    store.send('another message');

    expect(api.chat).toHaveBeenCalledWith({ conversationId: 'conv-1', message: 'another message' });
    expect(api.getConversation).not.toHaveBeenCalled();
    expect(store.messages().length).toBe(4);
  });

  it('send() sets an error message on failure', () => {
    api.chat.and.returnValue(throwError(() => new Error('boom')));

    store.send('hi');

    expect(store.error()).toBe('Could not send that message. Please try again.');
    expect(store.sending()).toBe(false);
  });
});
