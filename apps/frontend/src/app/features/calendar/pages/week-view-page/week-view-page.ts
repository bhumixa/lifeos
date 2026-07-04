import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { CalendarFilters } from '../../components/calendar-filters/calendar-filters';
import { EventCard } from '../../components/event-card/event-card';
import { CalendarApiService } from '../../services/calendar-api.service';
import { CalendarStore } from '../../state/calendar-store';
import {
  addDaysToLocalDateString,
  endOfLocalDayIso,
  groupEventsByDate,
  startOfLocalDayIso,
  toLocalDateString,
  weekDatesContaining,
} from '../../utils/calendar-display';

interface WeekDayCell {
  date: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  events: CalendarEvent[];
}

/**
 * Read-mostly 7-day overview — a Monday-start week (matching PlannerService/HabitsService's own
 * week-window convention) of compact day cells, each listing that day's events; clicking a day
 * opens it in Day View, which is where drag-and-drop editing actually happens. Mirrors Planner's
 * own WeekViewPage exactly: Week View stays simple, Day View gets the richer timeline (see the
 * class doc on MonthViewPage for why).
 */
@Component({
  selector: 'app-week-view-page',
  imports: [MatButtonModule, MatIconModule, Skeleton, EmptyState, CalendarFilters, EventCard],
  templateUrl: './week-view-page.html',
  styleUrl: './week-view-page.scss',
})
export class WeekViewPage implements OnInit {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly router = inject(Router);
  protected readonly store = inject(CalendarStore);

  private readonly anchorDate = signal(toLocalDateString(new Date()));
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly allEvents = signal<CalendarEvent[]>([]);

  protected readonly calendarsById = computed<Map<string, Calendar>>(
    () => new Map(this.store.calendars().map((calendar) => [calendar.id, calendar])),
  );

  protected readonly cells = computed<WeekDayCell[]>(() => {
    const today = toLocalDateString(new Date());
    const visibleIds = new Set(this.store.visibleCalendars().map((calendar) => calendar.id));
    const visibleEvents = this.allEvents().filter((event) => visibleIds.has(event.calendarId));
    const byDate = groupEventsByDate(visibleEvents);

    return weekDatesContaining(this.anchorDate()).map((date) => {
      const day = Number(date.split('-')[2]);
      const cellDate = parseLocalDate(date);
      return {
        date,
        dayLabel: cellDate.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNumber: day,
        isToday: date === today,
        events: (byDate.get(date) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime)),
      };
    });
  });

  protected readonly weekLabel = computed(() => {
    const dates = weekDatesContaining(this.anchorDate());
    const format = (date: string): string =>
      parseLocalDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${format(dates[0])} – ${format(dates[6])}`;
  });

  ngOnInit(): void {
    this.store.load();
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
    void this.router.navigate(['/calendar/day', date]);
  }

  private loadWeek(): void {
    this.loading.set(true);
    this.error.set(null);
    const dates = weekDatesContaining(this.anchorDate());

    this.calendarApi
      .listEvents({
        from: startOfLocalDayIso(dates[0]),
        to: endOfLocalDayIso(dates[6]),
        pageSize: 100,
      })
      .subscribe({
        next: (result) => {
          this.allEvents.set(result.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load this week. Please try again.');
          this.loading.set(false);
        },
      });
  }
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
