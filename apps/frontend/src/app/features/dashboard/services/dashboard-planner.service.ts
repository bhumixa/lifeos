import { Injectable, inject } from '@angular/core';
import type { PlannerDay } from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { PlannerApiService } from '../../planner/services/planner-api.service';

/** Thin pass-through to GET /planner/today — the dashboard's Today's Timeline widget and its
 * Next Activity/Remaining Time/Focus Time/Completed Blocks stat cards are all derived from this
 * one day, via `computePlannerSummary` (same "one endpoint, several widgets" shape
 * DashboardHabitStatsService already uses for GET /habits/summary). */
@Injectable({ providedIn: 'root' })
export class DashboardPlannerService {
  private readonly plannerApi = inject(PlannerApiService);

  load(): Observable<PlannerDay> {
    return this.plannerApi.today();
  }
}
