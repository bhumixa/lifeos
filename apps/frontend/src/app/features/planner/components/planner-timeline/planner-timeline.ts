import { Component, computed, input, output } from '@angular/core';
import type { PlannerBlock } from '@lifeos/shared-types';
import { BreakIndicator } from '../break-indicator/break-indicator';
import { ConflictWarning } from '../conflict-warning/conflict-warning';
import { CurrentTimeIndicator } from '../current-time-indicator/current-time-indicator';
import type { BlockMoveEvent, BlockResizeEvent } from '../planner-block/planner-block';
import { PlannerBlockComponent } from '../planner-block/planner-block';
import { TimeGrid } from '../time-grid/time-grid';
import { detectConflicts, minutesSinceMidnight, toLocalDateString } from '../../utils/planner-display';

const START_HOUR = 7;
const END_HOUR = 22;
const PIXELS_PER_MINUTE = 1.2;

/**
 * The vertically-scrolling, absolutely-positioned day schedule — the composite the Planner
 * Dashboard, Day View, and Week View's day drill-in all render. Re-emits every PlannerBlock
 * interaction (edit/complete/delete/duplicate/move/resize) to its host page, which is the one
 * that actually talks to PlannerStore — this component only lays blocks out and reports gestures.
 */
@Component({
  selector: 'app-planner-timeline',
  imports: [TimeGrid, CurrentTimeIndicator, ConflictWarning, BreakIndicator, PlannerBlockComponent],
  templateUrl: './planner-timeline.html',
  styleUrl: './planner-timeline.scss',
})
export class PlannerTimeline {
  readonly date = input.required<string>();
  readonly blocks = input<PlannerBlock[]>([]);
  readonly showConflictWarning = input(true);

  readonly editBlock = output<PlannerBlock>();
  readonly toggleComplete = output<PlannerBlock>();
  readonly deleteBlock = output<PlannerBlock>();
  readonly duplicateBlock = output<PlannerBlock>();
  readonly moveBlock = output<BlockMoveEvent>();
  readonly resizeBlock = output<BlockResizeEvent>();

  protected readonly startHour = START_HOUR;
  protected readonly endHour = END_HOUR;
  protected readonly pixelsPerMinute = PIXELS_PER_MINUTE;
  protected readonly containerHeight = (END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE;

  protected readonly isToday = computed(() => this.date() === toLocalDateString(new Date()));
  protected readonly conflictingIds = computed(() => detectConflicts(this.blocks()));

  protected topFor(block: PlannerBlock): number {
    return (minutesSinceMidnight(block.startTime) - this.startHour * 60) * this.pixelsPerMinute;
  }
}
