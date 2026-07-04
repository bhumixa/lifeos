import { Component, inject } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CalendarStore } from '../../state/calendar-store';

/** Interactive show/hide toggle per calendar — every view (Month/Week/Day/Dashboard) reads
 * CalendarStore.visibleCalendars, which this component's checkboxes drive directly. Distinct from
 * CalendarLegend, which only displays the same list read-only. */
@Component({
  selector: 'app-calendar-filters',
  imports: [MatCheckboxModule],
  templateUrl: './calendar-filters.html',
  styleUrl: './calendar-filters.scss',
})
export class CalendarFilters {
  protected readonly store = inject(CalendarStore);
  protected readonly calendars = this.store.calendars;

  protected toggle(calendarId: string): void {
    this.store.toggleVisibility(calendarId);
  }
}
