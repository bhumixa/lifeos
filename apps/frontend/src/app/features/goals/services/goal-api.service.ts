import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateGoalMilestoneRequest,
  CreateGoalRequest,
  Goal,
  GoalMilestone,
  GoalProgress,
  GoalQueryParams,
  PaginatedGoals,
  UpdateGoalMilestoneRequest,
  UpdateGoalRequest,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's GoalsStore's / the editor page's job).
 * Milestone mutations hit `/goals/milestones/:id` directly (not nested under a goal id in the
 * URL), matching the backend's own route shape — see GoalsController. */
@Injectable({ providedIn: 'root' })
export class GoalApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/goals`;

  list(query: GoalQueryParams): Observable<PaginatedGoals> {
    return this.http.get<PaginatedGoals>(this.baseUrl, { params: this.buildParams(query) });
  }

  getById(id: string): Observable<Goal> {
    return this.http.get<Goal>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateGoalRequest): Observable<Goal> {
    return this.http.post<Goal>(this.baseUrl, request);
  }

  update(id: string, request: UpdateGoalRequest): Observable<Goal> {
    return this.http.patch<Goal>(`${this.baseUrl}/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  archive(id: string): Observable<Goal> {
    return this.http.post<Goal>(`${this.baseUrl}/${id}/archive`, {});
  }

  unarchive(id: string): Observable<Goal> {
    return this.http.post<Goal>(`${this.baseUrl}/${id}/unarchive`, {});
  }

  progress(id: string): Observable<GoalProgress> {
    return this.http.get<GoalProgress>(`${this.baseUrl}/${id}/progress`);
  }

  addMilestone(goalId: string, request: CreateGoalMilestoneRequest): Observable<GoalMilestone> {
    return this.http.post<GoalMilestone>(`${this.baseUrl}/${goalId}/milestones`, request);
  }

  updateMilestone(milestoneId: string, request: UpdateGoalMilestoneRequest): Observable<GoalMilestone> {
    return this.http.patch<GoalMilestone>(`${this.baseUrl}/milestones/${milestoneId}`, request);
  }

  removeMilestone(milestoneId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/milestones/${milestoneId}`);
  }

  private buildParams(query: GoalQueryParams): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
