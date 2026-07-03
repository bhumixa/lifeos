import { Component, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerBlock } from '@lifeos/shared-types';
import { interval, map, startWith } from 'rxjs';
import { formatTimeOfDay } from '../../utils/planner-display';

/** Small contextual banner shown only while "now" falls inside a BREAK-type block — renders
 * nothing otherwise, since there's nothing to say most of the day. */
@Component({
  selector: 'app-break-indicator',
  imports: [MatIconModule],
  templateUrl: './break-indicator.html',
  styleUrl: './break-indicator.scss',
})
export class BreakIndicator {
  readonly blocks = input<PlannerBlock[]>([]);

  private readonly now = toSignal(
    interval(30_000).pipe(
      startWith(0),
      map(() => new Date()),
    ),
    { initialValue: new Date() },
  );

  protected readonly activeBreak = computed<PlannerBlock | null>(() => {
    const now = this.now().getTime();
    return (
      this.blocks().find(
        (block) =>
          block.type === 'BREAK' && new Date(block.startTime).getTime() <= now && now < new Date(block.endTime).getTime(),
      ) ?? null
    );
  });

  protected readonly formatTimeOfDay = formatTimeOfDay;
}
