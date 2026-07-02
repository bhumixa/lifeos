import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { HealthCheckResponse } from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Thin wrapper around the backend's /health endpoint. Exists in Milestone 1
 * purely to prove the frontend → backend → database chain is wired correctly
 * end to end (see docs/09-roadmap.md, Phase 0 exit criteria) — later features
 * follow this same pattern of a core/feature service calling a typed endpoint.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  check(): Observable<HealthCheckResponse> {
    return this.http.get<HealthCheckResponse>(`${environment.apiUrl}/health`);
  }
}
