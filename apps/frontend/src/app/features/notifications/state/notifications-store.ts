import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  Notification,
  NotificationPreference,
  NotificationQueryParams,
  PaginationMeta,
  UpdateNotificationPreferenceRequest,
} from '@lifeos/shared-types';
import { Observable, tap } from 'rxjs';
import { NotificationApiService } from '../services/notification-api.service';

const DEFAULT_QUERY: NotificationQueryParams = { page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' };
const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/**
 * `providedIn: 'root'` (unlike GoalsStore's own list-page-only scope) — this is the one feature
 * store more than one part of the shell needs at once: the Navbar's NotificationBell (unread
 * count + preview) and the Notification Center page (full filtered list) both read from it, so a
 * mark-read/dismiss from either place is reflected in the other without a page reload. This is the
 * same "single source of truth, several consumers" role AuthService's own signals already play for
 * the whole app.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly api = inject(NotificationApiService);

  private readonly notificationsSignal = signal<Notification[]>([]);
  private readonly metaSignal = signal<PaginationMeta>(DEFAULT_META);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly querySignal = signal<NotificationQueryParams>({ ...DEFAULT_QUERY });

  private readonly unreadSignal = signal<Notification[]>([]);
  private readonly unreadLoadingSignal = signal(false);

  private readonly preferenceSignal = signal<NotificationPreference | null>(null);
  private readonly preferenceLoadingSignal = signal(false);

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly query = this.querySignal.asReadonly();
  readonly isEmpty = computed(
    () => !this.loadingSignal() && !this.errorSignal() && this.notificationsSignal().length === 0,
  );

  readonly unread = this.unreadSignal.asReadonly();
  readonly unreadCount = computed(() => this.unreadSignal().length);
  readonly unreadLoading = this.unreadLoadingSignal.asReadonly();

  readonly preference = this.preferenceSignal.asReadonly();
  readonly preferenceLoading = this.preferenceLoadingSignal.asReadonly();

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.list(this.querySignal()).subscribe({
      next: (result) => {
        this.notificationsSignal.set(result.data);
        this.metaSignal.set(result.meta);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load notifications. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  loadUnread(): void {
    this.unreadLoadingSignal.set(true);
    this.api.unread().subscribe({
      next: (unread) => {
        this.unreadSignal.set(unread);
        this.unreadLoadingSignal.set(false);
      },
      error: () => this.unreadLoadingSignal.set(false),
    });
  }

  loadPreferences(): void {
    this.preferenceLoadingSignal.set(true);
    this.api.getPreferences().subscribe({
      next: (preference) => {
        this.preferenceSignal.set(preference);
        this.preferenceLoadingSignal.set(false);
      },
      error: () => this.preferenceLoadingSignal.set(false),
    });
  }

  updatePreferences(request: UpdateNotificationPreferenceRequest): Observable<NotificationPreference> {
    return this.api
      .updatePreferences(request)
      .pipe(tap((preference) => this.preferenceSignal.set(preference)));
  }

  /** Applies a filter/sort/page change and reloads. Any change other than an explicit page number
   * resets to page 1, the same rule GoalsStore.setQuery/TasksStore.setQuery already follow. */
  setQuery(patch: Partial<NotificationQueryParams>): void {
    const isPageChange = Object.keys(patch).length === 1 && 'page' in patch;
    this.querySignal.update((current) => ({ ...current, ...patch, ...(isPageChange ? {} : { page: 1 }) }));
    this.load();
  }

  resetFilters(): void {
    this.querySignal.set({ ...DEFAULT_QUERY });
    this.load();
  }

  markRead(id: string): Observable<Notification> {
    return this.api.markRead(id).pipe(tap(() => this.refreshBoth()));
  }

  markAllRead(): Observable<{ updatedCount: number }> {
    return this.api.markAllRead().pipe(tap(() => this.refreshBoth()));
  }

  dismiss(id: string): Observable<Notification> {
    return this.api.dismiss(id).pipe(tap(() => this.refreshBoth()));
  }

  remove(id: string): Observable<void> {
    return this.api.remove(id).pipe(tap(() => this.refreshBoth()));
  }

  private refreshBoth(): void {
    this.load();
    this.loadUnread();
  }
}
