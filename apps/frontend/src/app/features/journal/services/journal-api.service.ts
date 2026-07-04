import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateJournalAttachmentRequest,
  CreateJournalEntryRequest,
  JournalAttachment,
  JournalDay,
  JournalHistoryQueryParams,
  JournalEntry,
  JournalPrompt,
  JournalQueryParams,
  JournalSearchQueryParams,
  JournalType,
  PaginatedJournalEntries,
  UpdateJournalEntryRequest,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's JournalStore's / each page's job),
 * the same shape as GoalApiService/HabitApiService. */
@Injectable({ providedIn: 'root' })
export class JournalApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/journal`;

  list(query: JournalQueryParams): Observable<PaginatedJournalEntries> {
    return this.http.get<PaginatedJournalEntries>(this.baseUrl, { params: this.buildParams(query) });
  }

  history(query: JournalHistoryQueryParams): Observable<PaginatedJournalEntries> {
    return this.http.get<PaginatedJournalEntries>(`${this.baseUrl}/history`, {
      params: this.buildParams(query),
    });
  }

  search(query: JournalSearchQueryParams): Observable<PaginatedJournalEntries> {
    return this.http.get<PaginatedJournalEntries>(`${this.baseUrl}/search`, {
      params: this.buildParams(query),
    });
  }

  getPrompts(type?: JournalType): Observable<JournalPrompt[]> {
    return this.http.get<JournalPrompt[]>(`${this.baseUrl}/prompts`, {
      params: this.buildParams(type ? { type } : {}),
    });
  }

  getByDate(date: string): Observable<JournalDay> {
    return this.http.get<JournalDay>(`${this.baseUrl}/${date}`);
  }

  create(request: CreateJournalEntryRequest): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(this.baseUrl, request);
  }

  update(id: string, request: UpdateJournalEntryRequest): Observable<JournalEntry> {
    return this.http.patch<JournalEntry>(`${this.baseUrl}/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addAttachment(request: CreateJournalAttachmentRequest): Observable<JournalAttachment> {
    return this.http.post<JournalAttachment>(`${this.baseUrl}/attachments`, request);
  }

  removeAttachment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/attachments/${id}`);
  }

  private buildParams(query: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
