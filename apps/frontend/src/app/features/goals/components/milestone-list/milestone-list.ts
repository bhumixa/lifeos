import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import type { GoalMilestone } from '@lifeos/shared-types';

/** Presentational checkpoint list for a Goal — shared by the Goal Detail page (read-mostly, a
 * quick-toggle) and the Goal Milestones page (full add/edit/delete), the same "one list
 * component, two hosting contexts" shape RoutineEditorPage's step list already establishes. */
@Component({
  selector: 'app-milestone-list',
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule],
  templateUrl: './milestone-list.html',
  styleUrl: './milestone-list.scss',
})
export class MilestoneList {
  readonly milestones = input.required<GoalMilestone[]>();
  /** Hides edit/delete actions for read-mostly hosts (Goal Detail) — toggling completion is
   * always available regardless. */
  readonly editable = input(true);

  readonly toggleCompleted = output<GoalMilestone>();
  readonly edit = output<GoalMilestone>();
  readonly delete = output<GoalMilestone>();

  protected formatDueDate(dueDate: string | null): string | null {
    if (!dueDate) {
      return null;
    }
    return new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
