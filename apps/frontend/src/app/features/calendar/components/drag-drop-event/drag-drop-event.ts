import { CdkDrag, type CdkDragEnd } from '@angular/cdk/drag-drop';
import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { Calendar, CalendarEvent } from '@lifeos/shared-types';
import { formatEventTimeRange } from '../../utils/calendar-display';

export interface EventMoveEvent {
  event: CalendarEvent;
  deltaMinutes: number;
}

const SNAP_MINUTES = 5;

/**
 * One absolutely-positioned event within the Day View's hour grid — the Calendar module's own
 * drag-to-move interaction, the same vertical-only, 5-minute-snapped CDK pattern
 * PlannerBlockComponent already established (see its own class doc), rebuilt here as Calendar's
 * own component rather than importing Planner's — feature folders stay isolated per
 * docs/07-folder-structure.md ("shared code belongs inside shared/"), so cross-feature reuse on
 * the frontend happens by composing a sibling feature's exported *service* (as
 * DashboardJournalService does with JournalApiService), not by reaching into its `components/`.
 * Never calls the API directly — DayViewPage owns CalendarStore/CalendarApiService and decides
 * what a move means (PATCH /calendar/events/:id).
 */
@Component({
  selector: 'app-drag-drop-event',
  imports: [CdkDrag, MatIconModule],
  templateUrl: './drag-drop-event.html',
  styleUrl: './drag-drop-event.scss',
})
export class DragDropEvent {
  readonly event = input.required<CalendarEvent>();
  readonly calendar = input<Calendar | undefined>(undefined);
  readonly top = input.required<number>();
  readonly pixelsPerMinute = input(1.2);
  readonly dragBoundary = input<string>('.timeline-surface');

  readonly edit = output<CalendarEvent>();
  readonly move = output<EventMoveEvent>();

  protected readonly color = computed(() => this.calendar()?.color ?? '#3F51B5');
  protected readonly timeLabel = computed(() => formatEventTimeRange(this.event()));
  protected readonly hasConflict = computed(() => this.event().conflictsWith.length > 0);
  protected readonly height = computed(() => {
    const minutes = (new Date(this.event().endTime).getTime() - new Date(this.event().startTime).getTime()) / 60_000;
    return minutes * this.pixelsPerMinute();
  });

  protected onClick(): void {
    this.edit.emit(this.event());
  }

  protected onDragEnded(dragEvent: CdkDragEnd): void {
    const deltaMinutes = Math.round(dragEvent.distance.y / this.pixelsPerMinute() / SNAP_MINUTES) * SNAP_MINUTES;
    // The page re-renders this event at its corrected time once the move is persisted — reset the
    // CDK transform now so it doesn't double up with that re-render (same fix PlannerBlockComponent
    // documents for its own onDragEnded).
    dragEvent.source.reset();
    if (deltaMinutes !== 0) {
      this.move.emit({ event: this.event(), deltaMinutes });
    }
  }
}
