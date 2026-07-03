import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { formatXp } from '../../utils/streak-display';

/** Total XP readout. No level system yet — per the milestone brief ("prepare the foundation,
 * don't build levels yet"), this deliberately shows only the running total, not a level/progress
 * bar toward a next threshold that doesn't exist. */
@Component({
  selector: 'app-xp-progress',
  imports: [MatIconModule],
  templateUrl: './xp-progress.html',
  styleUrl: './xp-progress.scss',
})
export class XpProgress {
  readonly xp = input.required<number>();

  protected readonly formattedXp = computed(() => formatXp(this.xp()));
}
