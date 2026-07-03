import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerBlock } from '@lifeos/shared-types';
import { detectConflicts, formatTimeOfDay } from '../../utils/planner-display';

/** Surfaces overlapping blocks the backend deliberately allows to be created (only the
 * deterministic generator avoids overlap on its own output — see PlannerService) — without this,
 * a manually double-booked time slot would be silently invisible. Renders nothing when there are
 * no conflicts, which is the common case. */
@Component({
  selector: 'app-conflict-warning',
  imports: [MatIconModule],
  templateUrl: './conflict-warning.html',
  styleUrl: './conflict-warning.scss',
})
export class ConflictWarning {
  readonly blocks = input<PlannerBlock[]>([]);

  protected readonly conflicting = computed(() => {
    const ids = detectConflicts(this.blocks());
    return this.blocks()
      .filter((block) => ids.has(block.id))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  protected readonly formatTimeOfDay = formatTimeOfDay;
}
