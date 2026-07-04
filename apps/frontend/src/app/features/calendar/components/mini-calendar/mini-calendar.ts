import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { CalendarEvent } from '@lifeos/shared-types';
import { groupEventsByDate, toLocalDateString } from '../../utils/calendar-display';

interface MiniCalendarCell {
  /** "YYYY-MM-DD", or null for a padding cell outside the visible month. */
  date: string | null;
  dayOfMonth: number | null;
  hasEvents: boolean;
}

/** A compact month picker marking which dates have events with a dot — the Calendar Dashboard's
 * at-a-glance widget and quick date-jump control. Hand-rolled, following JournalCalendar's own
 * month-grid convention (this codebase's "no charting/calendar library" precedent — see
 * docs/07-folder-structure.md's note on Journal). */
@Component({
  selector: 'app-mini-calendar',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './mini-calendar.html',
  styleUrl: './mini-calendar.scss',
})
export class MiniCalendar {
  readonly events = input<CalendarEvent[]>([]);
  readonly month = input<Date>(new Date());
  readonly selectedDate = input<string | null>(null);

  readonly monthChange = output<Date>();
  readonly dateSelect = output<string>();

  protected readonly weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  protected readonly today = toLocalDateString(new Date());

  protected readonly monthLabel = computed(() =>
    this.month().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  protected readonly weeks = computed<MiniCalendarCell[][]>(() => {
    const month = this.month();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    const eventsByDate = groupEventsByDate(this.events());

    const cells: MiniCalendarCell[] = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ date: null, dayOfMonth: null, hasEvents: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ date: dateStr, dayOfMonth: day, hasEvents: (eventsByDate.get(dateStr)?.length ?? 0) > 0 });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, dayOfMonth: null, hasEvents: false });
    }

    const weeks: MiniCalendarCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

  protected previousMonth(): void {
    const month = this.month();
    this.monthChange.emit(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }

  protected nextMonth(): void {
    const month = this.month();
    this.monthChange.emit(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  protected selectDate(cell: MiniCalendarCell): void {
    if (cell.date) {
      this.dateSelect.emit(cell.date);
    }
  }

  protected isSelected(cell: MiniCalendarCell): boolean {
    return cell.date !== null && cell.date === this.selectedDate();
  }

  protected isToday(cell: MiniCalendarCell): boolean {
    return cell.date === this.today;
  }
}
