import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AnalyticsExportResult,
  AnalyticsOverview,
  AnalyticsQueryParams,
  CalendarAnalytics,
  CreateAnalyticsExportRequest,
  GoalsAnalytics,
  HabitsAnalytics,
  JournalAnalytics,
  ListAnalyticsExportsQueryParams,
  PaginatedAnalyticsExports,
  PlannerAnalytics,
  ProductivityAnalytics,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's AnalyticsPeriodStore's/each page's own
 * job). Mirrors AiApiService's shape exactly. */
@Injectable({ providedIn: 'root' })
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/analytics`;

  getOverview(): Observable<AnalyticsOverview> {
    return this.http.get<AnalyticsOverview>(`${this.baseUrl}/overview`);
  }

  getProductivity(query: AnalyticsQueryParams): Observable<ProductivityAnalytics> {
    return this.http.get<ProductivityAnalytics>(`${this.baseUrl}/productivity`, { params: this.buildParams(query) });
  }

  getHabits(query: AnalyticsQueryParams): Observable<HabitsAnalytics> {
    return this.http.get<HabitsAnalytics>(`${this.baseUrl}/habits`, { params: this.buildParams(query) });
  }

  getGoals(query: AnalyticsQueryParams): Observable<GoalsAnalytics> {
    return this.http.get<GoalsAnalytics>(`${this.baseUrl}/goals`, { params: this.buildParams(query) });
  }

  getPlanner(query: AnalyticsQueryParams): Observable<PlannerAnalytics> {
    return this.http.get<PlannerAnalytics>(`${this.baseUrl}/planner`, { params: this.buildParams(query) });
  }

  getJournal(query: AnalyticsQueryParams): Observable<JournalAnalytics> {
    return this.http.get<JournalAnalytics>(`${this.baseUrl}/journal`, { params: this.buildParams(query) });
  }

  getCalendar(query: AnalyticsQueryParams): Observable<CalendarAnalytics> {
    return this.http.get<CalendarAnalytics>(`${this.baseUrl}/calendar`, { params: this.buildParams(query) });
  }

  listExports(query: ListAnalyticsExportsQueryParams): Observable<PaginatedAnalyticsExports> {
    return this.http.get<PaginatedAnalyticsExports>(`${this.baseUrl}/export`, { params: this.buildParams(query) });
  }

  createExport(request: CreateAnalyticsExportRequest): Observable<AnalyticsExportResult> {
    return this.http.post<AnalyticsExportResult>(`${this.baseUrl}/export`, request);
  }

  private buildParams(query: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
