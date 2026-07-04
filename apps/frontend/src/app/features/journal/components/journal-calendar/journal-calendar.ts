import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { JournalEntry } from '@lifeos/shared-types';
import { MOOD_EMOJI } from '../../utils/journal-display';

interface CalendarCell {
  /** "YYYY-MM-DD", or null for a padding cell outside the visible month. */
  date: string | null;
  dayOfMonth: number | null;
  entries: JournalEntry[];
}

/** A month grid marking which dates have journal entries (mood emoji if one was recorded, a
 * plain dot otherwise) — Journal History's calendar view and the Journal Dashboard's at-a-glance
 * widget. Hand-rolled, matching this codebase's "no charting library" convention (see the note on
 * Goals' own GoalTimeline in docs/07-folder-structure.md). */
@Component({
  selector: 'app-journal-calendar',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './journal-calendar.html',
  styleUrl: './journal-calendar.scss',
})
export class JournalCalendar {
  readonly entries = input<JournalEntry[]>([]);
  readonly month = input<Date>(new Date());
  readonly monthChange = output<Date>();
  readonly dateSelect = output<string>();

  protected readonly weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  protected readonly moodEmoji = MOOD_EMOJI;

  protected readonly monthLabel = computed(() =>
    this.month().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  protected readonly weeks = computed<CalendarCell[][]>(() => {
    const month = this.month();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();

    const entriesByDate = new Map<string, JournalEntry[]>();
    for (const entry of this.entries()) {
      const bucket = entriesByDate.get(entry.date) ?? [];
      bucket.push(entry);
      entriesByDate.set(entry.date, bucket);
    }

    const cells: CalendarCell[] = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ date: null, dayOfMonth: null, entries: [] });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ date: dateStr, dayOfMonth: day, entries: entriesByDate.get(dateStr) ?? [] });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, dayOfMonth: null, entries: [] });
    }

    const weeks: CalendarCell[][] = [];
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

  protected selectDate(cell: CalendarCell): void {
    if (cell.date) {
      this.dateSelect.emit(cell.date);
    }
  }

  protected primaryMood(cell: CalendarCell): string | null {
    const withMood = cell.entries.find((entry) => entry.mood);
    return withMood?.mood ? this.moodEmoji[withMood.mood] : null;
  }
}
