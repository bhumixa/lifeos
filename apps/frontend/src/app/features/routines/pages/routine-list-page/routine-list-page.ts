import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Routine } from '@lifeos/shared-types';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { RoutineCard } from '../../components/routine-card/routine-card';
import { RoutinesStore } from '../../state/routines-store';

@Component({
  selector: 'app-routine-list-page',
  imports: [MatButtonModule, MatIconModule, EmptyState, Skeleton, RoutineCard],
  templateUrl: './routine-list-page.html',
  styleUrl: './routine-list-page.scss',
})
export class RoutineListPage implements OnInit {
  protected readonly store = inject(RoutinesStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly skeletonRows = Array.from({ length: 3 });

  ngOnInit(): void {
    this.store.load();
  }

  protected createRoutine(): void {
    void this.router.navigate(['/routines', 'new']);
  }

  protected viewRoutine(routine: Routine): void {
    void this.router.navigate(['/routines', routine.id]);
  }

  protected editRoutine(routine: Routine): void {
    void this.router.navigate(['/routines', routine.id, 'edit']);
  }

  protected toggleActive(routine: Routine): void {
    this.store.setActive(routine, !routine.isActive).subscribe({
      error: () => this.snackBar.open('Could not update the routine', 'Dismiss', { duration: 3000 }),
    });
  }

  protected duplicateRoutine(routine: Routine): void {
    this.store.duplicateRoutine(routine.id).subscribe({
      next: () => this.snackBar.open('Routine duplicated', 'Dismiss', { duration: 3000 }),
      error: () => this.snackBar.open('Could not duplicate the routine', 'Dismiss', { duration: 3000 }),
    });
  }

  protected deleteRoutine(routine: Routine): void {
    const ref = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Delete routine',
        message: `Delete "${routine.name}"? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.store.deleteRoutine(routine.id).subscribe({
        next: () => this.snackBar.open('Routine deleted', 'Dismiss', { duration: 3000 }),
        error: () => this.snackBar.open('Could not delete the routine', 'Dismiss', { duration: 3000 }),
      });
    });
  }

  protected retry(): void {
    this.store.load();
  }
}
