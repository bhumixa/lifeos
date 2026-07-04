import { Component, computed, input, output } from '@angular/core';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { EventCard } from '../event-card/event-card';
import { groupEventsByDate, monthGridDates, toLocalDateString } from '../../utils/calendar-display';

interface MonthGridCell {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const MAX_VISIBLE_PER_CELL = 3;

/** The Month View's full grid — a 6x7 (or however many weeks the month needs) layout of day
 * cells, each rendering up to a few event chips (via EventCard) with a "+N more" overflow
 * indicator. Purely presentational: MonthViewPage owns the fetched events/calendars and reacts to
 * this component's `dayClick`/`eventClick` outputs. */
@Component({
  selector: 'app-calendar-grid',
  imports: [EventCard],
  templateUrl: './calendar-grid.html',
  styleUrl: './calendar-grid.scss',
})
export class CalendarGrid {
  readonly month = input.required<Date>();
  readonly events = input<CalendarEvent[]>([]);
  readonly calendarsById = input<Map<string, Calendar>>(new Map());

  readonly dayClick = output<string>();
  readonly eventClick = output<CalendarEvent>();

  protected readonly weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  protected readonly maxVisible = MAX_VISIBLE_PER_CELL;
  private readonly today = toLocalDateString(new Date());

  protected readonly weeks = computed<MonthGridCell[][]>(() => {
    const month = this.month();
    const monthIndex = month.getMonth();
    const dates = monthGridDates(toLocalDateString(new Date(month.getFullYear(), monthIndex, 1)));
    const eventsByDate = groupEventsByDate(this.events());

    const cells: MonthGridCell[] = dates.map((dateStr) => {
      const [, cellMonth, cellDay] = dateStr.split('-').map(Number);
      return {
        date: dateStr,
        dayOfMonth: cellDay,
        isCurrentMonth: cellMonth - 1 === monthIndex,
        isToday: dateStr === this.today,
        events: (eventsByDate.get(dateStr) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime)),
      };
    });

    const weeks: MonthGridCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

  protected calendarFor(event: CalendarEvent): Calendar | undefined {
    return this.calendarsById().get(event.calendarId);
  }

  protected onDayClick(date: string): void {
    this.dayClick.emit(date);
  }

  protected onEventClick(event: CalendarEvent): void {
    this.eventClick.emit(event);
  }
}
