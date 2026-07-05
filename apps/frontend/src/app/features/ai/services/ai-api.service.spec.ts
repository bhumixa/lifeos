import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AiConversation, AiInsight } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { AiApiService } from './ai-api.service';

describe('AiApiService', () => {
  let service: AiApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/ai`;

  const mockInsight: AiInsight = {
    id: 'insight-1',
    type: 'PRODUCTIVITY',
    title: 'Weekly Productivity Trend',
    summary: 'Your completion rate dropped 12% this week.',
    content: 'Your completion rate dropped 12% this week.',
    confidence: 0.8,
    status: 'ACTIVE',
    sourceData: { flags: ['risk'] },
    generatedAt: '2026-07-05T08:00:00.000Z',
    expiresAt: '2026-07-06T08:00:00.000Z',
    createdAt: '2026-07-05T08:00:00.000Z',
  };

  const mockConversation: AiConversation = {
    id: 'conv-1',
    title: 'New Conversation',
    createdAt: '2026-07-05T08:00:00.000Z',
    updatedAt: '2026-07-05T08:00:00.000Z',
    messages: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AiApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listInsights() requests the insights URL with query params', () => {
    service.listInsights({ type: 'GOALS', status: 'ACTIVE' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/insights`);
    expect(req.request.params.get('type')).toBe('GOALS');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush({ data: [mockInsight], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
  });

  it('getInsight() requests one insight by id', () => {
    service.getInsight('insight-1').subscribe((result) => expect(result).toEqual(mockInsight));
    httpMock.expectOne(`${baseUrl}/insights/insight-1`).flush(mockInsight);
  });

  it('generateInsights() posts to the generate sub-resource', () => {
    service.generateInsights({ type: 'HABITS' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/insights/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'HABITS' });
    req.flush([mockInsight]);
  });

  it('chat() posts a message', () => {
    service.chat({ message: 'hello' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ message: 'hello' });
    req.flush({
      conversationId: 'conv-1',
      userMessage: { id: 'm1', conversationId: 'conv-1', role: 'USER', content: 'hello', createdAt: '2026-07-05T08:00:00.000Z' },
      assistantMessage: { id: 'm2', conversationId: 'conv-1', role: 'ASSISTANT', content: 'hi', createdAt: '2026-07-05T08:00:00.000Z' },
    });
  });

  it('listConversations() requests the conversations URL', () => {
    service.listConversations().subscribe();
    httpMock.expectOne(`${baseUrl}/conversations`).flush([]);
  });

  it('getConversation() requests one conversation by id', () => {
    service.getConversation('conv-1').subscribe((result) => expect(result).toEqual(mockConversation));
    httpMock.expectOne(`${baseUrl}/conversations/conv-1`).flush(mockConversation);
  });

  it('createConversation() posts to the conversations URL', () => {
    service.createConversation({ title: 'My chat' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/conversations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'My chat' });
    req.flush(mockConversation);
  });
});
