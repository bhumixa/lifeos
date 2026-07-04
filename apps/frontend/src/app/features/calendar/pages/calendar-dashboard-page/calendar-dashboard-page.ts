import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { AgendaView } from '../../components/agenda-view/agenda-view';
import { CalendarFilters } from '../../components/calendar-filters/calendar-filters';
import { CalendarLegend } from '../../components/calendar-legend/calendar-legend';
import { EventDialog, type EventDialogData } from '../../components/event-dialog/event-dialog';
import { MiniCalendar } from '../../components/mini-calendar/mini-calendar';
import { CalendarApiService } from '../../services/calendar-api.service';
import { CalendarStore } from '../../state/calendar-store';
import { addDaysToLocalDateString, endOfLocalDayIso, startOfLocalDayIso, toLocalDateString } from '../../utils/calendar-display';

const UPCOMING_WINDOW_DAYS = 7;

/**
 * The Calendar module's landing page — a mini month picker, the calendar legend/filters, and an
 * Agenda of the next 7 days' events (mirroring the "one/two endpoint(s), several derived
 * widgets" shape DashboardJournalService/DashboardGoalsService already establish for the main
 * Dashboard, applied here to Calendar's own dashboard instead of the app-wide one).
 */
@Component({
  selector: 'app-calendar-dashboard-page',
  imports: [MatButtonModule, MatIconModule, Skeleton, EmptyState, MiniCalendar, CalendarLegend, CalendarFilters, AgendaView],
  templateUrl: './calendar-dashboard-page.html',
  styleUrl: './calendar-dashboard-page.scss',
})
export class CalendarDashboardPage implements OnInit {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  protected readonly store = inject(CalendarStore);

  protected readonly month = signal(new Date());
  protected readonly monthEvents = signal<CalendarEvent[]>([]);
  protected readonly upcomingEvents = signal<CalendarEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly calendarsById = computed<Map<string, Calendar>>(
    () => new Map(this.store.calendars().map((calendar) => [calendar.id, calendar])),
  );

  ngOnInit(): void {
    this.store.load();
    this.loadUpcoming();
    this.loadMonth();
  }

  protected onMonthChange(month: Date): void {
    this.month.set(month);
    this.loadMonth();
  }

  protected onDateSelect(date: string): void {
    void this.router.navigate(['/calendar/day', date]);
  }

  protected goToMonth(): void {
    void this.router.navigate(['/calendar/month']);
  }

  protected goToWeek(): void {
    void this.router.navigate(['/calendar/week']);
  }

  protected goToSettings(): void {
    void this.router.navigate(['/calendar/settings']);
  }

  protected onAddEvent(): void {
    const dialogRef = this.dialog.open<EventDialog, EventDialogData>(EventDialog, {
      data: { mode: 'create', calendars: this.store.calendars() },
    });
    dialogRef.afterClosed().subscribe((request) => {
      if (!request) {
        return;
      }
      this.calendarApi.createEvent(request).subscribe(() => this.loadUpcoming());
    });
  }

  protected onEventClick(event: CalendarEvent): void {
    const dialogRef = this.dialog.open<EventDialog, EventDialogData>(EventDialog, {
      data: { mode: 'edit', calendars: this.store.calendars(), event },
    });
    dialogRef.afterClosed().subscribe((request) => {
      if (!request) {
        return;
      }
      this.calendarApi.updateEvent(event.id, request).subscribe(() => this.loadUpcoming());
    });
  }

  private loadMonth(): void {
    const month = this.month();
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    this.calendarApi
      .listEvents({
        from: startOfLocalDayIso(toLocalDateString(start)),
        to: endOfLocalDayIso(toLocalDateString(end)),
        pageSize: 100,
      })
      .subscribe({ next: (result) => this.monthEvents.set(result.data) });
  }

  private loadUpcoming(): void {
    this.loading.set(true);
    this.error.set(null);
    const today = toLocalDateString(new Date());
    const rangeEnd = addDaysToLocalDateString(today, UPCOMING_WINDOW_DAYS);

    this.calendarApi
      .listEvents({ from: startOfLocalDayIso(today), to: endOfLocalDayIso(rangeEnd), pageSize: 100 })
      .subscribe({
        next: (result) => {
          this.upcomingEvents.set(result.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load upcoming events. Please try again.');
          this.loading.set(false);
        },
      });
  }
}
