import { Component, computed, input, output } from '@angular/core';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { EventCard } from '../event-card/event-card';
import { groupEventsByDate } from '../../utils/calendar-display';

interface AgendaGroup {
  date: string;
  dayLabel: string;
  events: CalendarEvent[];
}

/** A flat, chronological list of events grouped by day — the Calendar Dashboard's "Upcoming
 * Events" widget and an alternate, denser view of any date range. Purely presentational, the same
 * role JournalTimeline plays for Journal entries. */
@Component({
  selector: 'app-agenda-view',
  imports: [EventCard],
  templateUrl: './agenda-view.html',
  styleUrl: './agenda-view.scss',
})
export class AgendaView {
  readonly events = input<CalendarEvent[]>([]);
  readonly calendarsById = input<Map<string, Calendar>>(new Map());
  readonly emptyMessage = input('No events in this range.');

  readonly eventClick = output<CalendarEvent>();

  protected readonly groups = computed<AgendaGroup[]>(() => {
    const byDate = groupEventsByDate(this.events());
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({
        date,
        dayLabel: dateLabel(date),
        events: [...events].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  });

  protected calendarFor(event: CalendarEvent): Calendar | undefined {
    return this.calendarsById().get(event.calendarId);
  }

  protected onEventClick(event: CalendarEvent): void {
    this.eventClick.emit(event);
  }
}

function dateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
