import { Component, inject, signal } from '@angular/core';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import type { JournalEntry, JournalSearchQueryParams, PaginationMeta } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { JournalTimeline } from '../../components/journal-timeline/journal-timeline';
import { SearchFilters } from '../../components/search-filters/search-filters';
import { JournalApiService } from '../../services/journal-api.service';

const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/** GET /journal/search's own page — a richer, page-local filter shape (keyword/mood/energy/tag/
 * goal/date-range/type) than JournalStore's simpler history query, so this manages its own state
 * directly via JournalApiService rather than going through the shared store (the same "a distinct
 * enough query shape gets its own local state" call JournalStore's own class doc documents). */
@Component({
  selector: 'app-search-journals-page',
  imports: [MatPaginatorModule, EmptyState, Skeleton, JournalTimeline, SearchFilters],
  templateUrl: './search-journals-page.html',
  styleUrl: './search-journals-page.scss',
})
export class SearchJournalsPage {
  private readonly journalApi = inject(JournalApiService);

  protected readonly query = signal<JournalSearchQueryParams>({ page: 1, pageSize: 20 });
  protected readonly results = signal<JournalEntry[]>([]);
  protected readonly meta = signal<PaginationMeta>(DEFAULT_META);
  protected readonly loading = signal(false);
  protected readonly hasSearched = signal(false);

  protected onFiltersChange(filters: JournalSearchQueryParams): void {
    this.query.set({ ...filters, page: 1, pageSize: this.query().pageSize });
    this.search();
  }

  protected onPageChange(event: PageEvent): void {
    this.query.update((current) => ({ ...current, page: event.pageIndex + 1, pageSize: event.pageSize }));
    this.search();
  }

  private search(): void {
    this.loading.set(true);
    this.hasSearched.set(true);
    this.journalApi.search(this.query()).subscribe({
      next: (result) => {
        this.results.set(result.data);
        this.meta.set(result.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
