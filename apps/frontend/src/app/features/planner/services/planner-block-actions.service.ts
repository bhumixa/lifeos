import { Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { PlannerBlock } from '@lifeos/shared-types';
import { ConfirmDialog, type ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { PlannerStore } from '../state/planner-store';
import { BlockDialog, type BlockDialogData } from '../components/block-dialog/block-dialog';
import type { BlockMoveEvent, BlockResizeEvent } from '../components/planner-block/planner-block';

const SNACKBAR_DURATION_MS = 3000;

/**
 * Every planner-consuming page (Planner Dashboard, Day View, and eventually Week View's day
 * drill-in) needs the exact same dialog-confirm-store-snackbar orchestration for add/edit/
 * complete/delete/duplicate/move/resize/generate — pulling it into one injectable keeps that
 * logic in one place instead of copy-pasted per page (see CLAUDE.md's "never duplicate logic").
 * Pages stay thin: wire template outputs straight to these methods.
 */
@Injectable({ providedIn: 'root' })
export class PlannerBlockActionsService {
  private readonly plannerStore = inject(PlannerStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly generatingSignal = signal(false);
  readonly generating = this.generatingSignal.asReadonly();

  openAddDialog(date: string): void {
    const ref = this.dialog.open(BlockDialog, { data: { mode: 'create', date } satisfies BlockDialogData });
    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.plannerStore.createBlock(result).subscribe({ error: () => this.notifyError('add the block') });
    });
  }

  openEditDialog(date: string, block: PlannerBlock): void {
    const ref = this.dialog.open(BlockDialog, { data: { mode: 'edit', date, block } satisfies BlockDialogData });
    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      this.plannerStore.updateBlock(block.id, result).subscribe({ error: () => this.notifyError('update the block') });
    });
  }

  toggleComplete(block: PlannerBlock): void {
    this.plannerStore.complete({ blockId: block.id, completed: !block.completed }).subscribe({
      error: () => this.notifyError('update the block'),
    });
  }

  confirmDelete(block: PlannerBlock): void {
    const data: ConfirmDialogData = {
      title: 'Delete this block?',
      message: `"${block.title}" will be removed from this day's plan.`,
      confirmLabel: 'Delete',
      destructive: true,
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe((confirmed: boolean | undefined) => {
        if (!confirmed) {
          return;
        }
        this.plannerStore.removeBlock(block.id).subscribe({ error: () => this.notifyError('delete the block') });
      });
  }

  duplicate(block: PlannerBlock): void {
    this.plannerStore
      .createBlock({
        type: block.type,
        referenceId: block.referenceId ?? undefined,
        title: `${block.title} (Copy)`,
        description: block.description ?? undefined,
        startTime: block.startTime,
        endTime: block.endTime,
        color: block.color ?? undefined,
      })
      .subscribe({ error: () => this.notifyError('duplicate the block') });
  }

  move(event: BlockMoveEvent): void {
    const deltaMs = event.deltaMinutes * 60_000;
    const startTime = new Date(new Date(event.block.startTime).getTime() + deltaMs).toISOString();
    const endTime = new Date(new Date(event.block.endTime).getTime() + deltaMs).toISOString();
    this.plannerStore.updateBlock(event.block.id, { startTime, endTime }).subscribe({
      error: () => this.notifyError('move the block'),
    });
  }

  resize(event: BlockResizeEvent): void {
    const endTime = new Date(
      new Date(event.block.startTime).getTime() + event.durationMinutes * 60_000,
    ).toISOString();
    this.plannerStore.updateBlock(event.block.id, { endTime }).subscribe({
      error: () => this.notifyError('resize the block'),
    });
  }

  confirmGenerate(date: string): void {
    const data: ConfirmDialogData = {
      title: "Generate this day's schedule?",
      message:
        'This replaces any Task, Routine, or Habit blocks already on this plan. Focus, break, and custom blocks you added are kept.',
      confirmLabel: 'Generate',
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe((confirmed: boolean | undefined) => {
        if (!confirmed) {
          return;
        }
        this.generatingSignal.set(true);
        this.plannerStore.generate({ date }).subscribe({
          next: (result) => {
            this.generatingSignal.set(false);
            const unscheduledCount = result.unscheduledTaskIds.length + result.unscheduledHabitIds.length;
            this.snackBar.open(
              unscheduledCount > 0
                ? `Schedule generated — ${unscheduledCount} item(s) didn't fit and were left unscheduled`
                : 'Schedule generated',
              'Dismiss',
              { duration: 4000 },
            );
          },
          error: () => {
            this.generatingSignal.set(false);
            this.notifyError('generate a schedule');
          },
        });
      });
  }

  private notifyError(action: string): void {
    this.snackBar.open(`Could not ${action}. Please try again.`, 'Dismiss', { duration: SNACKBAR_DURATION_MS });
  }
}
