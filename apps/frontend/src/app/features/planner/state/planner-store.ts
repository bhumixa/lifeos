import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  CompletePlannerBlockRequest,
  CreatePlannerBlockRequest,
  GeneratePlannerRequest,
  GeneratePlannerResult,
  PlannerBlock,
  PlannerDay,
  UpdatePlannerBlockRequest,
} from '@lifeos/shared-types';
import { Observable, tap } from 'rxjs';
import { PlannerApiService } from '../services/planner-api.service';
import { detectConflicts, toLocalDateString } from '../utils/planner-display';

/**
 * Owns the currently-viewed PlannerDay — one day at a time, since Day View, the Planner
 * Dashboard's "today" timeline, and Week View's day-cell drill-in all show exactly one date's
 * blocks at once. Unlike TasksStore/HabitsStore, every mutation endpoint here already returns
 * the whole updated day (see docs/05-architecture.md's Planner section), so mutations set the
 * signal directly from the response instead of issuing a separate reload — one request per
 * action instead of two.
 */
@Injectable({ providedIn: 'root' })
export class PlannerStore {
  private readonly plannerApi = inject(PlannerApiService);

  private readonly daySignal = signal<PlannerDay | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly day = this.daySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly blocks = computed<PlannerBlock[]>(() => this.daySignal()?.blocks ?? []);
  readonly isEmpty = computed(() => !this.loadingSignal() && !this.errorSignal() && this.blocks().length === 0);
  readonly conflictingBlockIds = computed(() => detectConflicts(this.blocks()));

  loadToday(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.plannerApi.today().subscribe({
      next: (day) => {
        this.daySignal.set(day);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set("Could not load today's plan. Please try again.");
        this.loadingSignal.set(false);
      },
    });
  }

  loadDate(date: string): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.plannerApi.getByDate(date).subscribe({
      next: (day) => {
        this.daySignal.set(day);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load this day. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  /** Re-fetches whichever date is currently loaded — used after an action whose response isn't
   * itself a full PlannerDay (there are none today, but keeps parity with TasksStore/HabitsStore
   * for callers that want an explicit refresh, e.g. after leaving and returning to the page). */
  refresh(): void {
    const current = this.daySignal();
    this.loadDate(current ? current.date : toLocalDateString(new Date()));
  }

  createBlock(request: CreatePlannerBlockRequest): Observable<PlannerDay> {
    return this.plannerApi.createBlock(request).pipe(tap((day) => this.daySignal.set(day)));
  }

  updateBlock(id: string, request: UpdatePlannerBlockRequest): Observable<PlannerDay> {
    return this.plannerApi.updateBlock(id, request).pipe(tap((day) => this.daySignal.set(day)));
  }

  removeBlock(id: string): Observable<void> {
    return this.plannerApi.removeBlock(id).pipe(tap(() => this.refresh()));
  }

  reorder(blockIds: string[]): Observable<PlannerDay> {
    const date = this.daySignal()?.date ?? toLocalDateString(new Date());
    return this.plannerApi.reorder({ date, blockIds }).pipe(tap((day) => this.daySignal.set(day)));
  }

  complete(request: CompletePlannerBlockRequest): Observable<PlannerDay> {
    return this.plannerApi.complete(request).pipe(tap((day) => this.daySignal.set(day)));
  }

  generate(request: GeneratePlannerRequest): Observable<GeneratePlannerResult> {
    return this.plannerApi.generate(request).pipe(tap((result) => this.daySignal.set(result)));
  }

  /** Optimistically reflects a drag-drop reorder locally before the server round-trip resolves —
   * mirrors RoutineEditorPage.onStepDrop's pattern of updating the visible order immediately. */
  applyOptimisticOrder(orderedBlocks: PlannerBlock[]): void {
    const current = this.daySignal();
    if (!current) {
      return;
    }
    this.daySignal.set({ ...current, blocks: orderedBlocks });
  }
}
