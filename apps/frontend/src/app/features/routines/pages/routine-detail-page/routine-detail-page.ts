import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Routine } from '@lifeos/shared-types';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { RoutineApiService } from '../../services/routine-api.service';
import { RoutinesStore } from '../../state/routines-store';
import { formatDuration, formatTimeOfDay } from '../../utils/routine-display';

/**
 * Fetches its one routine via RoutineApiService directly rather than through RoutinesStore —
 * page-local state with no other consumer, same rationale as TaskDetailPage.
 */
@Component({
  selector: 'app-routine-detail-page',
  imports: [MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, Skeleton],
  templateUrl: './routine-detail-page.html',
  styleUrl: './routine-detail-page.scss',
})
export class RoutineDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routineApi = inject(RoutineApiService);
  private readonly routinesStore = inject(RoutinesStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly routine = signal<Routine | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly durationLabel = computed(() => formatDuration(this.routine()?.totalDurationMinutes ?? 0));

  protected readonly formatTimeOfDay = formatTimeOfDay;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Routine not found.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.routineApi.getById(id).subscribe({
      next: (routine) => {
        this.routine.set(routine);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this routine. It may not exist, or you may not have access to it.');
        this.loading.set(false);
      },
    });
  }

  protected edit(): void {
    const current = this.routine();
    if (current) {
      void this.router.navigate(['/routines', current.id, 'edit']);
    }
  }

  protected toggleActive(): void {
    const current = this.routine();
    if (!current) {
      return;
    }
    this.routinesStore.setActive(current, !current.isActive).subscribe({
      next: (updated) => this.routine.set(updated),
      error: () => this.snackBar.open('Could not update the routine', 'Dismiss', { duration: 3000 }),
    });
  }

  protected duplicate(): void {
    const current = this.routine();
    if (!current) {
      return;
    }
    this.routinesStore.duplicateRoutine(current.id).subscribe({
      next: (copy) => {
        this.snackBar.open('Routine duplicated', 'Dismiss', { duration: 3000 });
        void this.router.navigate(['/routines', copy.id]);
      },
      error: () => this.snackBar.open('Could not duplicate the routine', 'Dismiss', { duration: 3000 }),
    });
  }

  protected delete(): void {
    const current = this.routine();
    if (!current) {
      return;
    }

    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete routine',
        message: `Delete "${current.name}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.routinesStore.deleteRoutine(current.id).subscribe({
        next: () => {
          this.snackBar.open('Routine deleted', 'Dismiss', { duration: 3000 });
          void this.router.navigate(['/routines']);
        },
        error: () => this.snackBar.open('Could not delete the routine', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected back(): void {
    void this.router.navigate(['/routines']);
  }
}
