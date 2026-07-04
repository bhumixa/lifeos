import { Injectable, computed, inject, signal } from '@angular/core';
import type { Calendar, CalendarSync, CreateCalendarRequest, UpdateCalendarRequest } from '@lifeos/shared-types';
import { Observable, tap } from 'rxjs';
import { CalendarApiService } from '../services/calendar-api.service';

/**
 * Owns the calendars list and the cross-page "which calendars are currently visible" filter
 * state (driven by CalendarFilters/CalendarLegend) — shared by every Calendar page. Each page
 * fetches its own event range directly via CalendarApiService instead (a month/week/day's worth
 * of events has no other consumer), the same "a single fetched slice has no other consumer" rule
 * JournalStore/GoalDetailPage already follow for their own narrow fetches.
 */
@Injectable({ providedIn: 'root' })
export class CalendarStore {
  private readonly calendarApi = inject(CalendarApiService);

  private readonly calendarsSignal = signal<Calendar[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly hiddenCalendarIdsSignal = signal<Set<string>>(new Set());

  readonly calendars = this.calendarsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** Enabled calendars the user hasn't hidden via CalendarFilters — what every view's event
   * query is actually scoped to. A newly created calendar is visible by default (it's simply
   * absent from hiddenCalendarIdsSignal until explicitly toggled off). */
  readonly visibleCalendars = computed(() =>
    this.calendarsSignal().filter(
      (calendar) => calendar.enabled && !this.hiddenCalendarIdsSignal().has(calendar.id),
    ),
  );

  readonly isEmpty = computed(
    () => !this.loadingSignal() && !this.errorSignal() && this.calendarsSignal().length === 0,
  );

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.calendarApi.listCalendars().subscribe({
      next: (calendars) => {
        this.calendarsSignal.set(calendars);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load calendars. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  isVisible(calendarId: string): boolean {
    return !this.hiddenCalendarIdsSignal().has(calendarId);
  }

  toggleVisibility(calendarId: string): void {
    this.hiddenCalendarIdsSignal.update((hidden) => {
      const next = new Set(hidden);
      if (next.has(calendarId)) {
        next.delete(calendarId);
      } else {
        next.add(calendarId);
      }
      return next;
    });
  }

  create(request: CreateCalendarRequest): Observable<Calendar> {
    return this.calendarApi.createCalendar(request).pipe(tap(() => this.load()));
  }

  update(id: string, request: UpdateCalendarRequest): Observable<Calendar> {
    return this.calendarApi.updateCalendar(id, request).pipe(tap(() => this.load()));
  }

  remove(id: string): Observable<void> {
    return this.calendarApi.removeCalendar(id).pipe(tap(() => this.load()));
  }

  sync(calendarId: string): Observable<CalendarSync> {
    return this.calendarApi.sync({ calendarId }).pipe(tap(() => this.load()));
  }
}
