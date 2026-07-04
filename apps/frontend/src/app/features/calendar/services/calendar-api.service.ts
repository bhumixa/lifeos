import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Calendar,
  CalendarEvent,
  CalendarEventQueryParams,
  CalendarQueryParams,
  CalendarSync,
  CreateCalendarEventRequest,
  CreateCalendarRequest,
  PaginatedCalendarEvents,
  SyncCalendarRequest,
  UpdateCalendarEventRequest,
  UpdateCalendarRequest,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's CalendarStore's / each page's job),
 * the same shape as JournalApiService/GoalApiService. */
@Injectable({ providedIn: 'root' })
export class CalendarApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/calendar`;

  listCalendars(query: CalendarQueryParams = {}): Observable<Calendar[]> {
    return this.http.get<Calendar[]>(this.baseUrl, { params: this.buildParams(query) });
  }

  getCalendar(id: string): Observable<Calendar> {
    return this.http.get<Calendar>(`${this.baseUrl}/${id}`);
  }

  createCalendar(request: CreateCalendarRequest): Observable<Calendar> {
    return this.http.post<Calendar>(this.baseUrl, request);
  }

  updateCalendar(id: string, request: UpdateCalendarRequest): Observable<Calendar> {
    return this.http.patch<Calendar>(`${this.baseUrl}/${id}`, request);
  }

  removeCalendar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listEvents(query: CalendarEventQueryParams): Observable<PaginatedCalendarEvents> {
    return this.http.get<PaginatedCalendarEvents>(`${this.baseUrl}/events`, {
      params: this.buildParams(query),
    });
  }

  getEvent(id: string): Observable<CalendarEvent> {
    return this.http.get<CalendarEvent>(`${this.baseUrl}/events/${id}`);
  }

  createEvent(request: CreateCalendarEventRequest): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(`${this.baseUrl}/events`, request);
  }

  updateEvent(id: string, request: UpdateCalendarEventRequest): Observable<CalendarEvent> {
    return this.http.patch<CalendarEvent>(`${this.baseUrl}/events/${id}`, request);
  }

  removeEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${id}`);
  }

  sync(request: SyncCalendarRequest): Observable<CalendarSync> {
    return this.http.post<CalendarSync>(`${this.baseUrl}/sync`, request);
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
