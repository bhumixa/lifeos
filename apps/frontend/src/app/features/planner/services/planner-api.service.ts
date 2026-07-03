import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  CompletePlannerBlockRequest,
  CreatePlannerBlockRequest,
  GeneratePlannerRequest,
  GeneratePlannerResult,
  PlannerDay,
  ReorderPlannerBlocksRequest,
  UpdatePlannerBlockRequest,
} from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Thin HTTP wrapper — no state, no business logic (that's PlannerStore's job), following the
 * same shape as TaskApiService/RoutineApiService/HabitApiService. */
@Injectable({ providedIn: 'root' })
export class PlannerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/planner`;

  today(): Observable<PlannerDay> {
    return this.http.get<PlannerDay>(`${this.baseUrl}/today`);
  }

  getByDate(date: string): Observable<PlannerDay> {
    return this.http.get<PlannerDay>(`${this.baseUrl}/${date}`);
  }

  createBlock(request: CreatePlannerBlockRequest): Observable<PlannerDay> {
    return this.http.post<PlannerDay>(`${this.baseUrl}/block`, request);
  }

  updateBlock(id: string, request: UpdatePlannerBlockRequest): Observable<PlannerDay> {
    return this.http.patch<PlannerDay>(`${this.baseUrl}/block/${id}`, request);
  }

  removeBlock(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/block/${id}`);
  }

  generate(request: GeneratePlannerRequest): Observable<GeneratePlannerResult> {
    return this.http.post<GeneratePlannerResult>(`${this.baseUrl}/generate`, request);
  }

  reorder(request: ReorderPlannerBlocksRequest): Observable<PlannerDay> {
    return this.http.post<PlannerDay>(`${this.baseUrl}/reorder`, request);
  }

  complete(request: CompletePlannerBlockRequest): Observable<PlannerDay> {
    return this.http.post<PlannerDay>(`${this.baseUrl}/complete`, request);
  }
}
