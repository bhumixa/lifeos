import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { GoalApiService } from '../../goals/services/goal-api.service';

export interface DashboardGoalsSummary {
  activeCount: number;
  averageProgressPercent: number;
  completionPercentage: number;
  nearestDeadline: { goalId: string; title: string; targetDate: string } | null;
}

/** Derives all four Dashboard Goal widgets (Active Goals, Today's Goal Progress, Goal Completion
 * %, Nearest Goal Deadline) from one `GET /goals` call — the same "derived via local computation"
 * shape DashboardRoutineSummaryService already establishes, since Goals has no dedicated summary
 * endpoint (per docs/05-architecture.md's Dashboard Rules: "avoid creating unnecessary
 * dashboard-specific endpoints" — a client-side reduction over the existing list endpoint covers
 * this milestone's four widgets without one). Archived goals are excluded (GoalApiService.list
 * defaults to that server-side); a `pageSize` of 100 is a documented placeholder cap, the same
 * "reasonable ceiling, not a real pagination need" precedent DashboardTaskStatsService's own
 * narrow queries already set. */
@Injectable({ providedIn: 'root' })
export class DashboardGoalsService {
  private readonly goalApi = inject(GoalApiService);

  load(): Observable<DashboardGoalsSummary> {
    return this.goalApi.list({ archived: false, pageSize: 100 }).pipe(
      map(({ data: goals }) => {
        const activeGoals = goals.filter((goal) => goal.status === 'ACTIVE');
        const completedGoals = goals.filter((goal) => goal.status === 'COMPLETED');

        const averageProgressPercent = activeGoals.length
          ? Math.round(activeGoals.reduce((sum, goal) => sum + goal.progressPercent, 0) / activeGoals.length)
          : 0;
        const completionPercentage = goals.length
          ? Math.round((completedGoals.length / goals.length) * 100)
          : 0;

        const upcoming = activeGoals
          .filter((goal) => goal.targetDate)
          .sort((a, b) => (a.targetDate as string).localeCompare(b.targetDate as string));
        const nearest = upcoming[0];

        return {
          activeCount: activeGoals.length,
          averageProgressPercent,
          completionPercentage,
          nearestDeadline: nearest
            ? { goalId: nearest.id, title: nearest.title, targetDate: nearest.targetDate as string }
            : null,
        };
      }),
    );
  }
}
