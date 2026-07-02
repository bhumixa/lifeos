import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  CreateTaskRequest,
  PaginationMeta,
  Task,
  TaskQueryParams,
  UpdateTaskRequest,
} from '@lifeos/shared-types';
import { Observable, tap } from 'rxjs';
import { TaskApiService } from '../services/task-api.service';

const DEFAULT_QUERY: TaskQueryParams = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' };
const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/**
 * Owns Task List page state (docs/08-tech-stack.md — signal-based store for cross-component
 * feature state). The Task Details page deliberately does *not* go through this store — a single
 * fetched task is page-local state with no other consumer, so it stays a plain signal in that
 * page component instead of being forced into a shared store.
 */
@Injectable({ providedIn: 'root' })
export class TasksStore {
  private readonly taskApi = inject(TaskApiService);

  private readonly tasksSignal = signal<Task[]>([]);
  private readonly metaSignal = signal<PaginationMeta>(DEFAULT_META);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly querySignal = signal<TaskQueryParams>({ ...DEFAULT_QUERY });

  readonly tasks = this.tasksSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly query = this.querySignal.asReadonly();
  readonly isEmpty = computed(() => !this.loadingSignal() && !this.errorSignal() && this.tasksSignal().length === 0);

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.taskApi.list(this.querySignal()).subscribe({
      next: (result) => {
        this.tasksSignal.set(result.data);
        this.metaSignal.set(result.meta);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load tasks. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  /** Applies a filter/search/sort/page change and reloads. Any change other than an explicit
   * page number resets to page 1 — e.g. changing the status filter shouldn't leave you stranded
   * on page 4 of a now much-shorter list. */
  setQuery(patch: Partial<TaskQueryParams>): void {
    const isPageChange = Object.keys(patch).length === 1 && 'page' in patch;
    this.querySignal.update((current) => ({ ...current, ...patch, ...(isPageChange ? {} : { page: 1 }) }));
    this.load();
  }

  resetFilters(): void {
    this.querySignal.set({ ...DEFAULT_QUERY });
    this.load();
  }

  createTask(request: CreateTaskRequest): Observable<Task> {
    return this.taskApi.create(request).pipe(tap(() => this.load()));
  }

  updateTask(id: string, request: UpdateTaskRequest): Observable<Task> {
    return this.taskApi.update(id, request).pipe(tap(() => this.load()));
  }

  deleteTask(id: string): Observable<void> {
    return this.taskApi.remove(id).pipe(tap(() => this.load()));
  }

  completeTask(id: string): Observable<Task> {
    return this.taskApi.complete(id).pipe(tap(() => this.load()));
  }
}
