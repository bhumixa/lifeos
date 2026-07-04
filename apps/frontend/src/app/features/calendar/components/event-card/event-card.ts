import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { formatEventTimeRange } from '../../utils/calendar-display';

/** Presentational event chip — used by AgendaView, CalendarGrid's day cells, and MiniCalendar's
 * hover/selection state. Never talks to the API itself; the host page decides what a click means
 * (open EventDialog in edit mode). Distinct from DragDropEvent, which wraps this same visual
 * shape with CDK drag positioning for the Day View's timeline — see its own class doc. */
@Component({
  selector: 'app-event-card',
  imports: [MatIconModule],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss',
})
export class EventCard {
  readonly event = input.required<CalendarEvent>();
  readonly calendar = input<Calendar | undefined>(undefined);
  readonly compact = input(false);

  // Not named `select` — @angular-eslint/no-output-native forbids outputs shadowing native DOM
  // event names (an HTML <select> element fires its own "select"/"change" events).
  readonly eventSelect = output<CalendarEvent>();

  protected readonly color = computed(() => this.calendar()?.color ?? '#3F51B5');
  protected readonly timeLabel = computed(() => formatEventTimeRange(this.event()));
  protected readonly hasConflict = computed(() => this.event().conflictsWith.length > 0);

  protected onClick(domEvent: Event): void {
    // Stops a click from bubbling to a containing day cell (CalendarGrid) that also opens a
    // dialog on click — this card's own click always means "open this event," never "also open
    // the day's create-event dialog underneath it."
    domEvent.stopPropagation();
    this.eventSelect.emit(this.event());
  }
}
