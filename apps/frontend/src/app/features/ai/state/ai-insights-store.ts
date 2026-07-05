import { Injectable, computed, inject, signal } from '@angular/core';
import type { AiInsight, AiInsightQueryParams, GenerateInsightRequest, PaginationMeta } from '@lifeos/shared-types';
import { AiApiService } from '../services/ai-api.service';

const DEFAULT_QUERY: AiInsightQueryParams = { page: 1, pageSize: 20, sortBy: 'generatedAt', sortOrder: 'desc' };
const DEFAULT_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/** Owns the AI Insights page's list/filter state — same shape as GoalsStore/TasksStore. The AI
 * Dashboard's own widgets go through DashboardAiService instead (a thin, one-call derivation, the
 * same "no dedicated store for a read-only dashboard summary" convention every other Dashboard
 * widget already follows) rather than this store, so generating insights from either page always
 * reads back through the same `GET /ai/insights` shape. */
@Injectable({ providedIn: 'root' })
export class AiInsightsStore {
  private readonly api = inject(AiApiService);

  private readonly insightsSignal = signal<AiInsight[]>([]);
  private readonly metaSignal = signal<PaginationMeta>(DEFAULT_META);
  private readonly loadingSignal = signal(false);
  private readonly generatingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly querySignal = signal<AiInsightQueryParams>({ ...DEFAULT_QUERY });

  readonly insights = this.insightsSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly generating = this.generatingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly query = this.querySignal.asReadonly();
  readonly isEmpty = computed(
    () => !this.loadingSignal() && !this.errorSignal() && this.insightsSignal().length === 0,
  );

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.api.listInsights(this.querySignal()).subscribe({
      next: (result) => {
        this.insightsSignal.set(result.data);
        this.metaSignal.set(result.meta);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load insights. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  setQuery(patch: Partial<AiInsightQueryParams>): void {
    const isPageChange = Object.keys(patch).length === 1 && 'page' in patch;
    this.querySignal.update((current) => ({ ...current, ...patch, ...(isPageChange ? {} : { page: 1 }) }));
    this.load();
  }

  resetFilters(): void {
    this.querySignal.set({ ...DEFAULT_QUERY });
    this.load();
  }

  /** Generates fresh insight(s) and reloads the list so the new row(s) appear immediately. */
  generate(request: GenerateInsightRequest = {}): void {
    this.generatingSignal.set(true);
    this.api.generateInsights(request).subscribe({
      next: () => {
        this.generatingSignal.set(false);
        this.load();
      },
      error: () => {
        this.errorSignal.set('Could not generate insights. Please try again.');
        this.generatingSignal.set(false);
      },
    });
  }
}
