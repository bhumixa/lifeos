import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { CalendarFilters } from '../../components/calendar-filters/calendar-filters';
import type { EventMoveEvent } from '../../components/drag-drop-event/drag-drop-event';
import { DragDropEvent } from '../../components/drag-drop-event/drag-drop-event';
import { EventDialog, type EventDialogData } from '../../components/event-dialog/event-dialog';
import { CalendarApiService } from '../../services/calendar-api.service';
import { CalendarStore } from '../../state/calendar-store';
import {
  addDaysToLocalDateString,
  endOfLocalDayIso,
  minutesSinceMidnight,
  startOfLocalDayIso,
  toLocalDateString,
} from '../../utils/calendar-display';

const PIXELS_PER_MINUTE = 1.2;

/**
 * The full day editor — `/calendar/day/:date` (defaults to today at `/calendar/day`) — a
 * 24-hour, absolutely-positioned timeline with drag-to-move events (see DragDropEvent's own class
 * doc for why this is Calendar's own component rather than reusing Planner's PlannerBlock).
 * Unlike Planner's fixed 7am-10pm window, Calendar events aren't confined to typical working
 * hours, so the grid spans the full day.
 */
@Component({
  selector: 'app-day-view-page',
  imports: [MatButtonModule, MatIconModule, Skeleton, EmptyState, CalendarFilters, DragDropEvent],
  templateUrl: './day-view-page.html',
  styleUrl: './day-view-page.scss',
})
export class DayViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly calendarApi = inject(CalendarApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(CalendarStore);

  protected readonly date = signal(toLocalDateString(new Date()));
  protected readonly events = signal<CalendarEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly hours = Array.from({ length: 24 }, (_, hour) => hour);
  protected readonly pixelsPerMinute = PIXELS_PER_MINUTE;
  protected readonly containerHeight = 24 * 60 * PIXELS_PER_MINUTE;

  protected readonly visibleEvents = computed(() => {
    const visibleIds = new Set(this.store.visibleCalendars().map((calendar) => calendar.id));
    return this.events().filter((event) => visibleIds.has(event.calendarId) && !event.allDay);
  });
  protected readonly allDayEvents = computed(() => {
    const visibleIds = new Set(this.store.visibleCalendars().map((calendar) => calendar.id));
    return this.events().filter((event) => visibleIds.has(event.calendarId) && event.allDay);
  });
  protected readonly calendarsById = computed<Map<string, Calendar>>(
    () => new Map(this.store.calendars().map((calendar) => [calendar.id, calendar])),
  );
  protected readonly isEmpty = computed(() => this.visibleEvents().length === 0 && this.allDayEvents().length === 0);

  protected readonly dateLabel = computed(() => {
    const [year, month, day] = this.date().split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  });

  ngOnInit(): void {
    this.store.load();
    const date = this.route.snapshot.paramMap.get('date');
    this.date.set(date ?? toLocalDateString(new Date()));
    this.loadDay();
  }

  protected previousDay(): void {
    this.navigateRelative(-1);
  }

  protected nextDay(): void {
    this.navigateRelative(1);
  }

  protected goToToday(): void {
    void this.router.navigate(['/calendar/day']);
    this.date.set(toLocalDateString(new Date()));
    this.loadDay();
  }

  private navigateRelative(deltaDays: number): void {
    const target = addDaysToLocalDateString(this.date(), deltaDays);
    void this.router.navigate(['/calendar/day', target]);
    this.date.set(target);
    this.loadDay();
  }

  protected topFor(event: CalendarEvent): number {
    return minutesSinceMidnight(event.startTime) * this.pixelsPerMinute;
  }

  protected onAddEvent(): void {
    this.openDialog({
      mode: 'create',
      calendars: this.store.calendars(),
      defaultStartTime: `${this.date()}T09:00:00.000Z`,
    });
  }

  protected onEditEvent(event: CalendarEvent): void {
    this.openDialog({ mode: 'edit', calendars: this.store.calendars(), event });
  }

  protected onMoveEvent({ event, deltaMinutes }: EventMoveEvent): void {
    const startTime = new Date(new Date(event.startTime).getTime() + deltaMinutes * 60_000).toISOString();
    const endTime = new Date(new Date(event.endTime).getTime() + deltaMinutes * 60_000).toISOString();
    this.calendarApi.updateEvent(event.id, { startTime, endTime }).subscribe(() => this.loadDay());
  }

  private openDialog(data: EventDialogData): void {
    const dialogRef = this.dialog.open<EventDialog, EventDialogData>(EventDialog, { data });
    dialogRef.afterClosed().subscribe((request) => {
      if (!request) {
        return;
      }
      const save$ = data.mode === 'edit' && data.event
        ? this.calendarApi.updateEvent(data.event.id, request)
        : this.calendarApi.createEvent(request);
      save$.subscribe(() => this.loadDay());
    });
  }

  private loadDay(): void {
    this.loading.set(true);
    this.error.set(null);
    this.calendarApi
      .listEvents({ from: startOfLocalDayIso(this.date()), to: endOfLocalDayIso(this.date()), pageSize: 100 })
      .subscribe({
        next: (result) => {
          this.events.set(result.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load this day. Please try again.');
          this.loading.set(false);
        },
      });
  }
}
