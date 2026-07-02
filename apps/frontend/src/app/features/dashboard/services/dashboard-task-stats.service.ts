import { Injectable, inject } from '@angular/core';
import { type Observable, forkJoin, map } from 'rxjs';
import { TaskApiService } from '../../tasks/services/task-api.service';

export interface TaskDashboardStats {
  todayCount: number;
  upcomingCount: number;
  completedTodayCount: number;
}

const UPCOMING_WINDOW_DAYS = 7;

/**
 * Computes the dashboard's three task metrics via GET /tasks's existing due-date/completed-date
 * filters (pageSize: 1, since only meta.total is needed) rather than adding dedicated summary
 * endpoints — Milestone 4 only specifies the six CRUD/complete endpoints.
 */
@Injectable({ providedIn: 'root' })
export class DashboardTaskStatsService {
  private readonly taskApi = inject(TaskApiService);

  load(): Observable<TaskDashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const upcomingWindowEnd = new Date(startOfToday.getTime() + (UPCOMING_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000);

    return forkJoin({
      today: this.taskApi.list({
        dueFrom: startOfToday.toISOString(),
        dueTo: startOfTomorrow.toISOString(),
        pageSize: 1,
      }),
      upcoming: this.taskApi.list({
        dueFrom: startOfTomorrow.toISOString(),
        dueTo: upcomingWindowEnd.toISOString(),
        pageSize: 1,
      }),
      completedToday: this.taskApi.list({
        completedFrom: startOfToday.toISOString(),
        completedTo: startOfTomorrow.toISOString(),
        pageSize: 1,
      }),
    }).pipe(
      map(({ today, upcoming, completedToday }) => ({
        todayCount: today.meta.total,
        upcomingCount: upcoming.meta.total,
        completedTodayCount: completedToday.meta.total,
      })),
    );
  }
}
