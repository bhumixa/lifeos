import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { Routine } from '@lifeos/shared-types';
import { DashboardRoutineSummaryService, RoutineSummary } from '../../services/dashboard-routine-summary.service';
import { formatTimeOfDay, timeToMinutes } from '../../../routines/utils/routine-display';

const EMPTY_SUMMARY: RoutineSummary = { current: null, next: null, completionPercent: 0 };

@Component({
  selector: 'app-routine-summary',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  templateUrl: './routine-summary.html',
  styleUrl: './routine-summary.scss',
})
export class RoutineSummaryCard implements OnInit {
  private readonly dashboardRoutineSummary = inject(DashboardRoutineSummaryService);

  protected readonly loading = signal(true);
  protected readonly summary = signal<RoutineSummary>(EMPTY_SUMMARY);
  protected readonly formatTimeOfDay = formatTimeOfDay;

  ngOnInit(): void {
    this.dashboardRoutineSummary.load().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Earliest step's start time — steps are displayed in `order`, which isn't guaranteed to
   * match chronological `startTime` if a user reorders them out of time sequence. */
  protected earliestStepTime(routine: Routine): string {
    const earliest = routine.steps.reduce((min, step) => (timeToMinutes(step.startTime) < timeToMinutes(min.startTime) ? step : min));
    return formatTimeOfDay(earliest.startTime);
  }
}
