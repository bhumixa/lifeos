import { Injectable, inject } from '@angular/core';
import type { HabitSummary } from '@lifeos/shared-types';
import type { Observable } from 'rxjs';
import { HabitApiService } from '../../habits/services/habit-api.service';

/** Thin pass-through to GET /habits/summary — the endpoint already returns exactly the shape
 * the dashboard's three habit cards need, unlike DashboardTaskStatsService (which has to derive
 * its numbers from GET /tasks's filters since no dedicated summary endpoint exists for tasks). */
@Injectable({ providedIn: 'root' })
export class DashboardHabitStatsService {
  private readonly habitApi = inject(HabitApiService);

  load(): Observable<HabitSummary> {
    return this.habitApi.summary();
  }
}
