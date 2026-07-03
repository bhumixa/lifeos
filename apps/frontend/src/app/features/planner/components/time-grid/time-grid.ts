import { Component, computed, input } from '@angular/core';

/** Background hour gridlines for the Planner Timeline — purely presentational, no data of its
 * own. `pixelsPerMinute` is shared with PlannerTimeline/PlannerBlock/CurrentTimeIndicator so every
 * layer positions against the same scale. */
@Component({
  selector: 'app-time-grid',
  templateUrl: './time-grid.html',
  styleUrl: './time-grid.scss',
})
export class TimeGrid {
  readonly startHour = input(7);
  readonly endHour = input(22);
  readonly pixelsPerMinute = input(1.2);

  protected readonly hours = computed(() => {
    const hours: number[] = [];
    for (let hour = this.startHour(); hour <= this.endHour(); hour++) {
      hours.push(hour);
    }
    return hours;
  });

  protected topFor(hour: number): number {
    return (hour - this.startHour()) * 60 * this.pixelsPerMinute();
  }

  protected label(hour: number): string {
    const reference = new Date();
    reference.setHours(hour, 0, 0, 0);
    return reference.toLocaleTimeString(undefined, { hour: 'numeric' });
  }
}
