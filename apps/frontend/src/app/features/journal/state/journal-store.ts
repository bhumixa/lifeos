import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  JournalEntry,
  JournalHistoryQueryParams,
  PaginationMeta,
} from '@lifeos/shared-types';
import { Observable, tap } from 'rxjs';
import { JournalApiService } from '../services/journal-api.service';

const DEFAULT_QUERY: JournalHistoryQueryParams = { page: 1, pageSize: 20 };
const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/** Owns Journal History's paginated timeline state — same shape as GoalsStore/TasksStore. Journal
 * Dashboard/Detail/Morning/Evening pages fetch their own narrow slice directly via
 * JournalApiService instead (a day's entries, or one entry by id), the same "a single fetched
 * entity/day has no other consumer" rule GoalDetailPage/HabitDetailPage already follow. Search
 * Journals has a distinctly richer filter shape (mood/energy/tag/goal/keyword) and manages its own
 * local state rather than overloading this store with a second query shape. */
@Injectable({ providedIn: 'root' })
export class JournalStore {
  private readonly journalApi = inject(JournalApiService);

  private readonly entriesSignal = signal<JournalEntry[]>([]);
  private readonly metaSignal = signal<PaginationMeta>(DEFAULT_META);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly querySignal = signal<JournalHistoryQueryParams>({ ...DEFAULT_QUERY });

  readonly entries = this.entriesSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly query = this.querySignal.asReadonly();
  readonly isEmpty = computed(() => !this.loadingSignal() && !this.errorSignal() && this.entriesSignal().length === 0);

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.journalApi.history(this.querySignal()).subscribe({
      next: (result) => {
        this.entriesSignal.set(result.data);
        this.metaSignal.set(result.meta);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load journal history. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  /** Any change other than an explicit page number resets to page 1, the same rule
   * GoalsStore.setQuery/TasksStore.setQuery apply. */
  setQuery(patch: Partial<JournalHistoryQueryParams>): void {
    const isPageChange = Object.keys(patch).length === 1 && 'page' in patch;
    this.querySignal.update((current) => ({ ...current, ...patch, ...(isPageChange ? {} : { page: 1 }) }));
    this.load();
  }

  resetFilters(): void {
    this.querySignal.set({ ...DEFAULT_QUERY });
    this.load();
  }

  removeEntry(id: string): Observable<void> {
    return this.journalApi.remove(id).pipe(tap(() => this.load()));
  }
}
