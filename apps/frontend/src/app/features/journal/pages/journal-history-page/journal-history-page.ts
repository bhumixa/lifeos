import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { JournalEntry, JournalType } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { JournalCalendar } from '../../components/journal-calendar/journal-calendar';
import { JournalTimeline } from '../../components/journal-timeline/journal-timeline';
import { StatisticsCard } from '../../components/statistics-card/statistics-card';
import { JournalApiService } from '../../services/journal-api.service';
import { JournalStore } from '../../state/journal-store';
import { TYPE_LABELS, toDateOnly } from '../../utils/journal-display';

type ViewMode = 'timeline' | 'calendar';

/** The paginated timeline (GET /journal/history) with an optional type filter, a calendar view
 * toggle, and a lightweight statistics summary — all driven by JournalStore. */
@Component({
  selector: 'app-journal-history-page',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatSelectModule,
    EmptyState,
    Skeleton,
    JournalCalendar,
    JournalTimeline,
    StatisticsCard,
  ],
  templateUrl: './journal-history-page.html',
  styleUrl: './journal-history-page.scss',
})
export class JournalHistoryPage implements OnInit {
  private readonly journalStore = inject(JournalStore);
  private readonly journalApi = inject(JournalApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly entries = this.journalStore.entries;
  protected readonly meta = this.journalStore.meta;
  protected readonly loading = this.journalStore.loading;
  protected readonly isEmpty = this.journalStore.isEmpty;

  protected readonly viewMode = signal<ViewMode>('timeline');
  protected readonly calendarMonth = signal(new Date());
  protected readonly calendarEntries = signal<JournalEntry[]>([]);
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly typeOptions = Object.entries(TYPE_LABELS) as [JournalType, string][];

  ngOnInit(): void {
    this.journalStore.load();
    this.loadCalendarMonth();
  }

  protected onTypeChange(type: JournalType | undefined): void {
    this.journalStore.setQuery({ type });
  }

  protected onPageChange(event: PageEvent): void {
    this.journalStore.setQuery({ page: event.pageIndex + 1, pageSize: event.pageSize });
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'calendar') {
      this.loadCalendarMonth();
    }
  }

  protected onMonthChange(month: Date): void {
    this.calendarMonth.set(month);
    this.loadCalendarMonth();
  }

  /** The calendar view needs every entry in the visible month regardless of the timeline's own
   * page size, so it fetches its own bounded range from GET /journal/history rather than reusing
   * JournalStore's paginated slice. */
  private loadCalendarMonth(): void {
    const month = this.calendarMonth();
    const dateFrom = toDateOnly(new Date(month.getFullYear(), month.getMonth(), 1));
    const dateTo = toDateOnly(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    this.journalApi.history({ dateFrom, dateTo, pageSize: 100 }).subscribe((result) => {
      this.calendarEntries.set(result.data);
    });
  }

  /** No dedicated "day view" route exists (only Journal Detail's `:date/:id`) — picking a
   * calendar date jumps straight to its first entry rather than adding a 7th page beyond this
   * milestone's given page list. */
  protected onCalendarDateSelect(date: string): void {
    this.journalApi.getByDate(date).subscribe((day) => {
      if (day.entries.length > 0) {
        void this.router.navigate(['/journal', date, day.entries[0].id]);
      } else {
        this.snackBar.open('No journal entries on that date', 'Dismiss', { duration: 3000 });
      }
    });
  }
}
