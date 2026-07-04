import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  Notification,
  NotificationPreference,
  NotificationQueryParams,
  PaginatedNotifications,
  UpdateNotificationPreferenceRequest,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's NotificationsStore's job). There is no
 * `create()` method here: notifications are only ever created server-side, as a side effect of
 * NotificationSchedulerService reacting to a domain event — see the backend's
 * NotificationsService class doc. */
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  list(query: NotificationQueryParams): Observable<PaginatedNotifications> {
    return this.http.get<PaginatedNotifications>(this.baseUrl, { params: this.buildParams(query) });
  }

  unread(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/unread`);
  }

  getPreferences(): Observable<NotificationPreference> {
    return this.http.get<NotificationPreference>(`${this.baseUrl}/preferences`);
  }

  updatePreferences(request: UpdateNotificationPreferenceRequest): Observable<NotificationPreference> {
    return this.http.patch<NotificationPreference>(`${this.baseUrl}/preferences`, request);
  }

  markRead(id: string): Observable<Notification> {
    return this.http.post<Notification>(`${this.baseUrl}/read/${id}`, {});
  }

  markAllRead(): Observable<{ updatedCount: number }> {
    return this.http.post<{ updatedCount: number }>(`${this.baseUrl}/read-all`, {});
  }

  dismiss(id: string): Observable<Notification> {
    return this.http.post<Notification>(`${this.baseUrl}/dismiss/${id}`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private buildParams(query: NotificationQueryParams): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
