import { Component, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map, startWith } from 'rxjs';

/** A horizontal "now" line across the Planner Timeline — only meaningful when the viewed date is
 * today, so `visible` is left to the caller (which knows whether the viewed date matches today).
 * Ticks once a minute, matching the dashboard page's own "now" cadence — a live schedule doesn't
 * need sub-minute precision. */
@Component({
  selector: 'app-current-time-indicator',
  templateUrl: './current-time-indicator.html',
  styleUrl: './current-time-indicator.scss',
})
export class CurrentTimeIndicator {
  readonly visible = input(true);
  readonly startHour = input(7);
  readonly pixelsPerMinute = input(1.2);

  private readonly now = toSignal(
    interval(60_000).pipe(
      startWith(0),
      map(() => new Date()),
    ),
    { initialValue: new Date() },
  );

  protected readonly top = computed(() => {
    const minutesSinceMidnight = this.now().getHours() * 60 + this.now().getMinutes();
    return (minutesSinceMidnight - this.startHour() * 60) * this.pixelsPerMinute();
  });

  protected readonly label = computed(() =>
    this.now().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  );
}
