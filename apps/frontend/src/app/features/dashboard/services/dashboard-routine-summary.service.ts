import { Injectable, inject } from '@angular/core';
import type { Routine } from '@lifeos/shared-types';
import { type Observable, map } from 'rxjs';
import { RoutineApiService } from '../../routines/services/routine-api.service';
import { timeToMinutes } from '../../routines/utils/routine-display';

export interface RoutineSummary {
  current: Routine | null;
  next: Routine | null;
  /** % of the *current* routine's steps whose start time has already passed "now" — a
   * time-elapsed proxy for completion, not persisted user-confirmed completion (Routine/
   * RoutineStep have no completion field — see the schema comment on Routine for why). 0 when
   * there's no current routine. */
  completionPercent: number;
}

const EMPTY_SUMMARY: RoutineSummary = { current: null, next: null, completionPercent: 0 };

@Injectable({ providedIn: 'root' })
export class DashboardRoutineSummaryService {
  private readonly routineApi = inject(RoutineApiService);

  load(): Observable<RoutineSummary> {
    return this.routineApi.list(true).pipe(map((routines) => this.computeSummary(routines, new Date())));
  }

  private computeSummary(routines: Routine[], now: Date): RoutineSummary {
    const withSteps = routines.filter((routine) => routine.steps.length > 0);
    if (withSteps.length === 0) {
      return EMPTY_SUMMARY;
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const windows = withSteps.map((routine) => ({
      routine,
      start: Math.min(...routine.steps.map((step) => timeToMinutes(step.startTime))),
      end: Math.max(...routine.steps.map((step) => timeToMinutes(step.startTime) + step.durationMinutes)),
    }));

    const current = windows.find((window) => nowMinutes >= window.start && nowMinutes < window.end) ?? null;
    const next =
      windows
        .filter((window) => window.start > nowMinutes && window.routine.id !== current?.routine.id)
        .sort((a, b) => a.start - b.start)[0] ?? null;

    const completionPercent = current
      ? Math.round(
          (current.routine.steps.filter((step) => timeToMinutes(step.startTime) <= nowMinutes).length /
            current.routine.steps.length) *
            100,
        )
      : 0;

    return { current: current?.routine ?? null, next: next?.routine ?? null, completionPercent };
  }
}
