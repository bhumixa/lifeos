import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AiConversation,
  AiConversationSummary,
  AiInsight,
  AiInsightQueryParams,
  ChatRequest,
  ChatResponse,
  CreateConversationRequest,
  GenerateInsightRequest,
  PaginatedAiInsights,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's AiInsightsStore/AiConversationsStore's
 * job). Mirrors NotificationApiService's shape exactly. */
@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/ai`;

  listInsights(query: AiInsightQueryParams): Observable<PaginatedAiInsights> {
    return this.http.get<PaginatedAiInsights>(`${this.baseUrl}/insights`, { params: this.buildParams(query) });
  }

  getInsight(id: string): Observable<AiInsight> {
    return this.http.get<AiInsight>(`${this.baseUrl}/insights/${id}`);
  }

  generateInsights(request: GenerateInsightRequest): Observable<AiInsight[]> {
    return this.http.post<AiInsight[]>(`${this.baseUrl}/insights/generate`, request);
  }

  chat(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, request);
  }

  listConversations(): Observable<AiConversationSummary[]> {
    return this.http.get<AiConversationSummary[]>(`${this.baseUrl}/conversations`);
  }

  getConversation(id: string): Observable<AiConversation> {
    return this.http.get<AiConversation>(`${this.baseUrl}/conversations/${id}`);
  }

  createConversation(request: CreateConversationRequest): Observable<AiConversation> {
    return this.http.post<AiConversation>(`${this.baseUrl}/conversations`, request);
  }

  private buildParams(query: AiInsightQueryParams): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
