import { Injectable, inject } from '@angular/core';
import type { Calendar, CalendarEvent, PlannerBlock } from '@lifeos/shared-types';
import { forkJoin, map, type Observable } from 'rxjs';
import { PlannerApiService } from '../../planner/services/planner-api.service';
import { CalendarApiService } from '../../calendar/services/calendar-api.service';
import {
  addDaysToLocalDateString,
  endOfLocalDayIso,
  startOfLocalDayIso,
  toLocalDateString,
} from '../../calendar/utils/calendar-display';

const UPCOMING_WINDOW_DAYS = 7;

export interface DashboardScheduleItem {
  id: string;
  title: string;
  startTime: string;
  color: string;
  source: 'planner' | 'calendar';
}

export interface DashboardCalendarSummary {
  todayEventsCount: number;
  upcomingEventsCount: number;
  calendarCount: number;
  enabledCalendarCount: number;
  /** Today's PlannerBlocks (reused from GET /planner/today, per "Reuse existing Planner APIs
   * where practical") merged with today's own CalendarEvents into one chronological list — the
   * Dashboard's "Today's Schedule" widget. */
  todaySchedule: DashboardScheduleItem[];
}

/** Derives the Dashboard's four Calendar widgets (Today's Events, Upcoming Events, Calendar
 * Overview, Today's Schedule) from GET /calendar/events (twice, for today and the 7-day upcoming
 * window), GET /calendar (the calendar list), and GET /planner/today (reused, not
 * re-implemented) — the same "one/two endpoint(s), several derived widgets" shape
 * DashboardJournalService/DashboardGoalsService already establish, per
 * docs/05-architecture.md's "avoid creating unnecessary dashboard-specific endpoints" rule. */
@Injectable({ providedIn: 'root' })
export class DashboardCalendarService {
  private readonly calendarApi = inject(CalendarApiService);
  private readonly plannerApi = inject(PlannerApiService);

  load(): Observable<DashboardCalendarSummary> {
    const today = toLocalDateString(new Date());
    const upcomingEnd = addDaysToLocalDateString(today, UPCOMING_WINDOW_DAYS);

    return forkJoin({
      calendars: this.calendarApi.listCalendars(),
      todayEvents: this.calendarApi.listEvents({
        from: startOfLocalDayIso(today),
        to: endOfLocalDayIso(today),
        pageSize: 100,
      }),
      upcoming: this.calendarApi.listEvents({
        from: startOfLocalDayIso(addDaysToLocalDateString(today, 1)),
        to: endOfLocalDayIso(upcomingEnd),
        pageSize: 100,
      }),
      plannerDay: this.plannerApi.today(),
    }).pipe(
      map(({ calendars, todayEvents, upcoming, plannerDay }) => ({
        todayEventsCount: todayEvents.meta.total,
        upcomingEventsCount: upcoming.meta.total,
        calendarCount: calendars.length,
        enabledCalendarCount: calendars.filter((calendar) => calendar.enabled).length,
        todaySchedule: mergeSchedule(plannerDay.blocks, todayEvents.data, calendars),
      })),
    );
  }
}

function mergeSchedule(
  blocks: PlannerBlock[],
  events: CalendarEvent[],
  calendars: Calendar[],
): DashboardScheduleItem[] {
  const calendarsById = new Map(calendars.map((calendar) => [calendar.id, calendar]));

  const plannerItems: DashboardScheduleItem[] = blocks.map((block) => ({
    id: `planner-${block.id}`,
    title: block.title,
    startTime: block.startTime,
    color: block.color ?? '#607D8B',
    source: 'planner',
  }));

  const calendarItems: DashboardScheduleItem[] = events.map((event) => ({
    id: `calendar-${event.id}`,
    title: event.title,
    startTime: event.startTime,
    color: calendarsById.get(event.calendarId)?.color ?? '#3F51B5',
    source: 'calendar',
  }));

  return [...plannerItems, ...calendarItems].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}
