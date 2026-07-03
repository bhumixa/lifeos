import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  CreateHabitRequest,
  Habit,
  HabitQueryParams,
  PaginationMeta,
  UpdateHabitRequest,
} from '@lifeos/shared-types';
import { Observable, tap } from 'rxjs';
import { HabitApiService } from '../services/habit-api.service';

const DEFAULT_QUERY: HabitQueryParams = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' };
const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/**
 * Owns Habit List page state — same shape as TasksStore. Today's Habits / Habit Detail / Habit
 * History pages deliberately don't go through this store, for the same reason TaskDetailPage
 * doesn't: each fetches its own page-local data with no other consumer (see TasksStore's class
 * doc).
 */
@Injectable({ providedIn: 'root' })
export class HabitsStore {
  private readonly habitApi = inject(HabitApiService);

  private readonly habitsSignal = signal<Habit[]>([]);
  private readonly metaSignal = signal<PaginationMeta>(DEFAULT_META);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly querySignal = signal<HabitQueryParams>({ ...DEFAULT_QUERY });

  readonly habits = this.habitsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly query = this.querySignal.asReadonly();
  readonly isEmpty = computed(
    () => !this.loadingSignal() && !this.errorSignal() && this.habitsSignal().length === 0,
  );

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.habitApi.list(this.querySignal()).subscribe({
      next: (result) => {
        this.habitsSignal.set(result.data);
        this.metaSignal.set(result.meta);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load habits. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  /** Applies a filter/search/sort/page change and reloads. Any change other than an explicit
   * page number resets to page 1 — same rule as TasksStore.setQuery. */
  setQuery(patch: Partial<HabitQueryParams>): void {
    const isPageChange = Object.keys(patch).length === 1 && 'page' in patch;
    this.querySignal.update((current) => ({ ...current, ...patch, ...(isPageChange ? {} : { page: 1 }) }));
    this.load();
  }

  resetFilters(): void {
    this.querySignal.set({ ...DEFAULT_QUERY });
    this.load();
  }

  createHabit(request: CreateHabitRequest): Observable<Habit> {
    return this.habitApi.create(request).pipe(tap(() => this.load()));
  }

  updateHabit(id: string, request: UpdateHabitRequest): Observable<Habit> {
    return this.habitApi.update(id, request).pipe(tap(() => this.load()));
  }

  deleteHabit(id: string): Observable<void> {
    return this.habitApi.remove(id).pipe(tap(() => this.load()));
  }

  /** Quick-complete: increments *today's* log by one (so repeated taps on a quantifiable habit
   * like "8 glasses of water" add up rather than reset), then reloads. Falls back to a plain
   * create when nothing's logged yet today. */
  quickComplete(habit: Habit): Observable<unknown> {
    const request$ = habit.completedToday
      ? this.habitApi.updateLog(habit.id, { completedCount: habit.todayCount + 1 })
      : this.habitApi.createLog(habit.id, {});
    return request$.pipe(tap(() => this.load()));
  }

  /** Removes today's log entirely (undoes a quick-complete tap), then reloads. */
  undoToday(habit: Habit): Observable<void> {
    return this.habitApi.removeLog(habit.id).pipe(tap(() => this.load()));
  }
}
