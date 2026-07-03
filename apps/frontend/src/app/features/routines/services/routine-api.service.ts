import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CreateRoutineRequest,
  CreateRoutineStepRequest,
  ReorderRoutineStepsRequest,
  Routine,
  UpdateRoutineRequest,
  UpdateRoutineStepRequest,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's RoutinesStore's / the editor page's job). */
@Injectable({ providedIn: 'root' })
export class RoutineApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/routines`;

  list(isActive?: boolean): Observable<Routine[]> {
    const params = isActive === undefined ? undefined : new HttpParams().set('isActive', String(isActive));
    return this.http.get<Routine[]>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Routine> {
    return this.http.get<Routine>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateRoutineRequest): Observable<Routine> {
    return this.http.post<Routine>(this.baseUrl, request);
  }

  update(id: string, request: UpdateRoutineRequest): Observable<Routine> {
    return this.http.patch<Routine>(`${this.baseUrl}/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  activate(id: string): Observable<Routine> {
    return this.http.patch<Routine>(`${this.baseUrl}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<Routine> {
    return this.http.patch<Routine>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  duplicate(id: string): Observable<Routine> {
    return this.http.post<Routine>(`${this.baseUrl}/${id}/duplicate`, {});
  }

  addStep(routineId: string, request: CreateRoutineStepRequest): Observable<Routine> {
    return this.http.post<Routine>(`${this.baseUrl}/${routineId}/steps`, request);
  }

  updateStep(routineId: string, stepId: string, request: UpdateRoutineStepRequest): Observable<Routine> {
    return this.http.patch<Routine>(`${this.baseUrl}/${routineId}/steps/${stepId}`, request);
  }

  removeStep(routineId: string, stepId: string): Observable<Routine> {
    return this.http.delete<Routine>(`${this.baseUrl}/${routineId}/steps/${stepId}`);
  }

  reorderSteps(routineId: string, request: ReorderRoutineStepsRequest): Observable<Routine> {
    return this.http.patch<Routine>(`${this.baseUrl}/${routineId}/steps/reorder`, request);
  }
}
