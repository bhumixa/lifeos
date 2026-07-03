import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  CreateGoalMilestoneRequest,
  CreateGoalRequest,
  Goal,
  GoalMilestone,
  GoalQueryParams,
  PaginationMeta,
  UpdateGoalMilestoneRequest,
  UpdateGoalRequest,
} from '@lifeos/shared-types';
import { Observable, tap } from 'rxjs';
import { GoalApiService } from '../services/goal-api.service';

const DEFAULT_QUERY: GoalQueryParams = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' };
const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/**
 * Owns Goals Dashboard (list) page state — same shape as TasksStore/HabitsStore. Goal Detail,
 * Goal Editor, and Goal Milestones pages deliberately do *not* go through this store: each fetches
 * its one goal directly via GoalApiService, the same "a single fetched entity has no other
 * consumer" rule TaskDetailPage/HabitDetailPage already follow — only reloading the shared list
 * afterward (via `refreshAfterMutation`) so the Dashboard reflects changes made from those pages.
 */
@Injectable({ providedIn: 'root' })
export class GoalsStore {
  private readonly goalApi = inject(GoalApiService);

  private readonly goalsSignal = signal<Goal[]>([]);
  private readonly metaSignal = signal<PaginationMeta>(DEFAULT_META);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly querySignal = signal<GoalQueryParams>({ ...DEFAULT_QUERY });

  readonly goals = this.goalsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly query = this.querySignal.asReadonly();
  readonly isEmpty = computed(() => !this.loadingSignal() && !this.errorSignal() && this.goalsSignal().length === 0);

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.goalApi.list(this.querySignal()).subscribe({
      next: (result) => {
        this.goalsSignal.set(result.data);
        this.metaSignal.set(result.meta);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load goals. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  /** Applies a filter/search/sort/page change and reloads. Any change other than an explicit
   * page number resets to page 1, the same rule TasksStore.setQuery applies. */
  setQuery(patch: Partial<GoalQueryParams>): void {
    const isPageChange = Object.keys(patch).length === 1 && 'page' in patch;
    this.querySignal.update((current) => ({ ...current, ...patch, ...(isPageChange ? {} : { page: 1 }) }));
    this.load();
  }

  resetFilters(): void {
    this.querySignal.set({ ...DEFAULT_QUERY });
    this.load();
  }

  createGoal(request: CreateGoalRequest): Observable<Goal> {
    return this.goalApi.create(request).pipe(tap(() => this.load()));
  }

  updateGoal(id: string, request: UpdateGoalRequest): Observable<Goal> {
    return this.goalApi.update(id, request).pipe(tap(() => this.load()));
  }

  deleteGoal(id: string): Observable<void> {
    return this.goalApi.remove(id).pipe(tap(() => this.load()));
  }

  archiveGoal(id: string): Observable<Goal> {
    return this.goalApi.archive(id).pipe(tap(() => this.load()));
  }

  unarchiveGoal(id: string): Observable<Goal> {
    return this.goalApi.unarchive(id).pipe(tap(() => this.load()));
  }

  addMilestone(goalId: string, request: CreateGoalMilestoneRequest): Observable<GoalMilestone> {
    return this.goalApi.addMilestone(goalId, request).pipe(tap(() => this.load()));
  }

  updateMilestone(milestoneId: string, request: UpdateGoalMilestoneRequest): Observable<GoalMilestone> {
    return this.goalApi.updateMilestone(milestoneId, request).pipe(tap(() => this.load()));
  }

  removeMilestone(milestoneId: string): Observable<void> {
    return this.goalApi.removeMilestone(milestoneId).pipe(tap(() => this.load()));
  }

  /** Refreshes the list without changing the current query — for pages (Detail/Editor/Milestones)
   * that mutate a goal outside this store's own API and want the Dashboard to reflect it next
   * time it's visited, without forcing a filter reset. */
  refreshAfterMutation(): void {
    this.load();
  }
}
