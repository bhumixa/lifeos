import { Injectable, computed, inject, signal } from '@angular/core';
import type { Routine } from '@lifeos/shared-types';
import { type Observable, tap } from 'rxjs';
import { RoutineApiService } from '../services/routine-api.service';

/** Owns Routine List page state. The Editor page manages its own local draft state instead of
 * going through this store — see routine-editor-page.ts for why. */
@Injectable({ providedIn: 'root' })
export class RoutinesStore {
  private readonly routineApi = inject(RoutineApiService);

  private readonly routinesSignal = signal<Routine[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly routines = this.routinesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isEmpty = computed(() => !this.loadingSignal() && !this.errorSignal() && this.routinesSignal().length === 0);

  load(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.routineApi.list().subscribe({
      next: (routines) => {
        this.routinesSignal.set(routines);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Could not load routines. Please try again.');
        this.loadingSignal.set(false);
      },
    });
  }

  deleteRoutine(id: string): Observable<void> {
    return this.routineApi.remove(id).pipe(tap(() => this.load()));
  }

  setActive(routine: Routine, isActive: boolean): Observable<Routine> {
    const request$ = isActive ? this.routineApi.activate(routine.id) : this.routineApi.deactivate(routine.id);
    return request$.pipe(tap(() => this.load()));
  }

  duplicateRoutine(id: string): Observable<Routine> {
    return this.routineApi.duplicate(id).pipe(tap(() => this.load()));
  }
}
