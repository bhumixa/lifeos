import { CdkDrag, type CdkDragEnd } from '@angular/cdk/drag-drop';
import { Component, HostListener, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerBlock as PlannerBlockModel } from '@lifeos/shared-types';
import { blockColor, formatDuration, formatTimeOfDay, TYPE_ICONS } from '../../utils/planner-display';

export interface BlockMoveEvent {
  block: PlannerBlockModel;
  deltaMinutes: number;
}

export interface BlockResizeEvent {
  block: PlannerBlockModel;
  durationMinutes: number;
}

const MIN_DURATION_MINUTES = 5;
const SNAP_MINUTES = 5;

/**
 * One absolutely-positioned block within the Planner Timeline. Owns its own drag-to-move (via
 * CDK, vertical-only, snapped to 5-minute increments) and resize (native Pointer Events — CDK has
 * no resize primitive) interactions, but never calls the API directly: both emit an event and let
 * the page decide (so the page can also keep `order` in sync via PlannerStore.reorder — see
 * DayViewPage).
 */
@Component({
  selector: 'app-planner-block',
  imports: [CdkDrag, MatIconModule],
  templateUrl: './planner-block.html',
  styleUrl: './planner-block.scss',
})
export class PlannerBlockComponent {
  readonly block = input.required<PlannerBlockModel>();
  readonly top = input.required<number>();
  readonly pixelsPerMinute = input(1.2);
  readonly hasConflict = input(false);
  readonly dragBoundary = input<string>('.timeline-surface');

  readonly edit = output<PlannerBlockModel>();
  readonly toggleComplete = output<PlannerBlockModel>();
  readonly deleteBlock = output<PlannerBlockModel>();
  readonly duplicate = output<PlannerBlockModel>();
  readonly move = output<BlockMoveEvent>();
  // Not named `resize` — @angular-eslint/no-output-native forbids outputs shadowing native DOM
  // event names (window fires its own "resize" event).
  readonly resizeBlock = output<BlockResizeEvent>();

  private readonly liveDurationOverride = signal<number | null>(null);
  private resizing = false;
  private resizeStartY = 0;
  private resizeStartDuration = 0;

  protected readonly color = computed(() => blockColor(this.block()));
  protected readonly icon = computed(() => TYPE_ICONS[this.block().type]);
  protected readonly timeLabel = computed(
    () => `${formatTimeOfDay(this.block().startTime)} – ${formatTimeOfDay(this.block().endTime)}`,
  );
  protected readonly durationLabel = computed(() => formatDuration(this.liveDurationOverride() ?? this.block().duration));
  protected readonly height = computed(
    () => (this.liveDurationOverride() ?? this.block().duration) * this.pixelsPerMinute(),
  );

  protected onClick(): void {
    this.edit.emit(this.block());
  }

  protected onToggleComplete(event: Event): void {
    event.stopPropagation();
    this.toggleComplete.emit(this.block());
  }

  protected onDelete(event: Event): void {
    event.stopPropagation();
    this.deleteBlock.emit(this.block());
  }

  protected onDuplicate(event: Event): void {
    event.stopPropagation();
    this.duplicate.emit(this.block());
  }

  protected onDragEnded(event: CdkDragEnd): void {
    const deltaMinutes = Math.round(event.distance.y / this.pixelsPerMinute() / SNAP_MINUTES) * SNAP_MINUTES;
    // The store re-renders this block at its corrected time once the move is persisted — reset
    // the CDK transform now so it doesn't double up with that re-render.
    event.source.reset();
    if (deltaMinutes !== 0) {
      this.move.emit({ block: this.block(), deltaMinutes });
    }
  }

  protected onResizeStart(event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.resizing = true;
    this.resizeStartY = event.clientY;
    this.resizeStartDuration = this.block().duration;
  }

  @HostListener('window:pointermove', ['$event'])
  protected onWindowPointerMove(event: PointerEvent): void {
    if (!this.resizing) {
      return;
    }
    const deltaMinutes = Math.round((event.clientY - this.resizeStartY) / this.pixelsPerMinute() / SNAP_MINUTES) * SNAP_MINUTES;
    this.liveDurationOverride.set(Math.max(MIN_DURATION_MINUTES, this.resizeStartDuration + deltaMinutes));
  }

  @HostListener('window:pointerup')
  protected onWindowPointerUp(): void {
    if (!this.resizing) {
      return;
    }
    this.resizing = false;
    const finalDuration = this.liveDurationOverride();
    this.liveDurationOverride.set(null);
    if (finalDuration !== null && finalDuration !== this.block().duration) {
      this.resizeBlock.emit({ block: this.block(), durationMinutes: finalDuration });
    }
  }
}
