import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { CalendarFilters } from '../../components/calendar-filters/calendar-filters';
import { CalendarGrid } from '../../components/calendar-grid/calendar-grid';
import { EventDialog, type EventDialogData } from '../../components/event-dialog/event-dialog';
import { CalendarApiService } from '../../services/calendar-api.service';
import { CalendarStore } from '../../state/calendar-store';
import { endOfLocalDayIso, startOfLocalDayIso, toLocalDateString } from '../../utils/calendar-display';

/** Full month grid (CalendarGrid) scoped to whichever calendars CalendarFilters currently has
 * visible. Click-to-open (create/edit), not drag-and-drop — the Day View is where dragging an
 * event to a new time actually happens (see the class doc on DragDropEvent), the same split
 * Planner itself draws between its own read-mostly Week View and drag-enabled Day View. */
@Component({
  selector: 'app-month-view-page',
  imports: [MatButtonModule, MatIconModule, Skeleton, EmptyState, CalendarGrid, CalendarFilters],
  templateUrl: './month-view-page.html',
  styleUrl: './month-view-page.scss',
})
export class MonthViewPage implements OnInit {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly store = inject(CalendarStore);

  protected readonly month = signal(new Date());
  protected readonly events = signal<CalendarEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly monthLabel = computed(() =>
    this.month().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );
  protected readonly visibleEvents = computed(() => {
    const visibleIds = new Set(this.store.visibleCalendars().map((calendar) => calendar.id));
    return this.events().filter((event) => visibleIds.has(event.calendarId));
  });
  protected readonly calendarsById = computed<Map<string, Calendar>>(
    () => new Map(this.store.calendars().map((calendar) => [calendar.id, calendar])),
  );

  ngOnInit(): void {
    this.store.load();
    this.loadMonth();
  }

  protected previousMonth(): void {
    const month = this.month();
    this.month.set(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    this.loadMonth();
  }

  protected nextMonth(): void {
    const month = this.month();
    this.month.set(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    this.loadMonth();
  }

  protected today(): void {
    this.month.set(new Date());
    this.loadMonth();
  }

  protected onDayClick(date: string): void {
    this.openDialog({ mode: 'create', calendars: this.store.calendars(), defaultStartTime: `${date}T09:00:00.000Z` });
  }

  protected onEventClick(event: CalendarEvent): void {
    this.openDialog({ mode: 'edit', calendars: this.store.calendars(), event });
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
      save$.subscribe(() => this.loadMonth());
    });
  }

  private loadMonth(): void {
    this.loading.set(true);
    this.error.set(null);
    const month = this.month();
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    this.calendarApi
      .listEvents({
        from: startOfLocalDayIso(toLocalDateString(start)),
        to: endOfLocalDayIso(toLocalDateString(end)),
        pageSize: 100,
      })
      .subscribe({
        next: (result) => {
          this.events.set(result.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load this month. Please try again.');
          this.loading.set(false);
        },
      });
  }
}
