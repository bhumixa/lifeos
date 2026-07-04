import { Component, input } from '@angular/core';
import type { Calendar } from '@lifeos/shared-types';

/** Read-only key mapping each calendar's color swatch to its name/provider/event count — the
 * Calendar Dashboard's and Settings page's "what am I looking at" reference. Distinct from
 * CalendarFilters, which is the interactive show/hide control; Legend never mutates anything. */
@Component({
  selector: 'app-calendar-legend',
  imports: [],
  templateUrl: './calendar-legend.html',
  styleUrl: './calendar-legend.scss',
})
export class CalendarLegend {
  readonly calendars = input<Calendar[]>([]);
}
