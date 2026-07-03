import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerDay } from '@lifeos/shared-types';
import { forkJoin } from 'rxjs';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { PlannerApiService } from '../../services/planner-api.service';
import { addDaysToLocalDateString, blockColor, toLocalDateString, TYPE_ICONS } from '../../utils/planner-display';

interface WeekDayCell {
  date: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  day: PlannerDay;
}

/**
 * Read-mostly 7-day overview — a Monday-start week (matching HabitsService's own week-window
 * convention) of compact day cells, each summarizing its blocks; clicking a day opens it in Day
 * View, which is where actual editing happens. Fetches all 7 days directly through
 * PlannerApiService (not PlannerStore, which holds exactly one day) since this page's shape —
 * several days at once — doesn't fit that single-day model.
 */
@Component({
  selector: 'app-week-view-page',
  imports: [MatButtonModule, MatIconModule, Skeleton, EmptyState],
  templateUrl: './week-view-page.html',
  styleUrl: './week-view-page.scss',
})
export class WeekViewPage implements OnInit {
  private readonly plannerApi = inject(PlannerApiService);
  private readonly router = inject(Router);

  private readonly anchorDate = signal(toLocalDateString(new Date()));
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cells = signal<WeekDayCell[]>([]);

  protected readonly weekLabel = computed(() => {
    const week = this.cells();
    if (week.length === 0) {
      return '';
    }
    const format = (date: string): string => {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    return `${format(week[0].date)} – ${format(week[week.length - 1].date)}`;
  });

  protected readonly typeIcons = TYPE_ICONS;
  protected readonly blockColor = blockColor;

  ngOnInit(): void {
    this.loadWeek();
  }

  protected previousWeek(): void {
    this.anchorDate.set(addDaysToLocalDateString(this.anchorDate(), -7));
    this.loadWeek();
  }

  protected nextWeek(): void {
    this.anchorDate.set(addDaysToLocalDateString(this.anchorDate(), 7));
    this.loadWeek();
  }

  protected thisWeek(): void {
    this.anchorDate.set(toLocalDateString(new Date()));
    this.loadWeek();
  }

  protected openDay(date: string): void {
    void this.router.navigate(['/schedule/day', date]);
  }

  private loadWeek(): void {
    this.loading.set(true);
    this.error.set(null);

    const today = toLocalDateString(new Date());
    const [year, month, day] = this.anchorDate().split('-').map(Number);
    // Monday-start week, same convention HabitsService.currentPeriodWindow uses for WEEKLY habits.
    const dayOfWeek = (new Date(year, month - 1, day).getDay() + 6) % 7;
    const monday = addDaysToLocalDateString(this.anchorDate(), -dayOfWeek);
    const dates = Array.from({ length: 7 }, (_, index) => addDaysToLocalDateString(monday, index));

    forkJoin(dates.map((date) => this.plannerApi.getByDate(date))).subscribe({
      next: (days) => {
        this.cells.set(
          days.map((plannerDay, index) => {
            const [cellYear, cellMonth, cellDay] = dates[index].split('-').map(Number);
            const cellDate = new Date(cellYear, cellMonth - 1, cellDay);
            return {
              date: dates[index],
              dayLabel: cellDate.toLocaleDateString(undefined, { weekday: 'short' }),
              dayNumber: cellDay,
              isToday: dates[index] === today,
              day: plannerDay,
            };
          }),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this week. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
