import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateHabitLogRequest,
  CreateHabitRequest,
  Habit,
  HabitHistoryQueryParams,
  HabitLog,
  HabitQueryParams,
  HabitSummary,
  PaginatedHabitLogs,
  PaginatedHabits,
  UpdateHabitLogRequest,
  UpdateHabitRequest,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's HabitsStore's job), following the
 * same shape as TaskApiService/RoutineApiService. */
@Injectable({ providedIn: 'root' })
export class HabitApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/habits`;

  list(query: HabitQueryParams): Observable<PaginatedHabits> {
    return this.http.get<PaginatedHabits>(this.baseUrl, { params: this.buildParams(query) });
  }

  getById(id: string): Observable<Habit> {
    return this.http.get<Habit>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateHabitRequest): Observable<Habit> {
    return this.http.post<Habit>(this.baseUrl, request);
  }

  update(id: string, request: UpdateHabitRequest): Observable<Habit> {
    return this.http.patch<Habit>(`${this.baseUrl}/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  createLog(id: string, request: CreateHabitLogRequest): Observable<HabitLog> {
    return this.http.post<HabitLog>(`${this.baseUrl}/${id}/log`, request);
  }

  updateLog(id: string, request: UpdateHabitLogRequest): Observable<HabitLog> {
    return this.http.patch<HabitLog>(`${this.baseUrl}/${id}/log`, request);
  }

  removeLog(id: string, date?: string): Observable<void> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.delete<void>(`${this.baseUrl}/${id}/log`, { params });
  }

  today(): Observable<Habit[]> {
    return this.http.get<Habit[]>(`${this.baseUrl}/today`);
  }

  summary(): Observable<HabitSummary> {
    return this.http.get<HabitSummary>(`${this.baseUrl}/summary`);
  }

  history(query: HabitHistoryQueryParams): Observable<PaginatedHabitLogs> {
    return this.http.get<PaginatedHabitLogs>(`${this.baseUrl}/history`, {
      params: this.buildParams(query),
    });
  }

  private buildParams(query: HabitQueryParams | HabitHistoryQueryParams): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
