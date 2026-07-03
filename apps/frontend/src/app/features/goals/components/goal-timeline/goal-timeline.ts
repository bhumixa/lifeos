import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { Goal } from '@lifeos/shared-types';

interface TimelineEntry {
  key: string;
  label: string;
  date: string | null;
  kind: 'start' | 'milestone' | 'target';
  completed: boolean;
}

/**
 * Vertical timeline of a goal's start date, milestones (in order), and target date — presentational
 * only, plain CSS (a connecting line + dots), no charting library, following the same
 * "hand-rolled SVG/CSS, no chart dependency" convention habit-progress-ring/habit-calendar-heatmap
 * already establish. There's no existing linear-timeline precedent in the codebase to reuse (the
 * closest is Planner's hour-by-hour time-grid, a different shape entirely — see docs/07-folder-
 * structure.md's note on Milestone 9), so this is a new, small component built to match that
 * house style rather than adopting a charting dependency.
 */
@Component({
  selector: 'app-goal-timeline',
  imports: [MatIconModule],
  templateUrl: './goal-timeline.html',
  styleUrl: './goal-timeline.scss',
})
export class GoalTimeline {
  readonly goal = input.required<Goal>();

  protected readonly entries = computed<TimelineEntry[]>(() => {
    const goal = this.goal();
    const milestones = [...goal.milestones].sort((a, b) => a.order - b.order);

    const result: TimelineEntry[] = [];
    if (goal.startDate) {
      result.push({ key: 'start', label: 'Start', date: goal.startDate, kind: 'start', completed: true });
    }
    for (const milestone of milestones) {
      result.push({
        key: milestone.id,
        label: milestone.title,
        date: milestone.dueDate,
        kind: 'milestone',
        completed: milestone.completed,
      });
    }
    if (goal.targetDate) {
      result.push({
        key: 'target',
        label: 'Target',
        date: goal.targetDate,
        kind: 'target',
        completed: goal.status === 'COMPLETED',
      });
    }
    return result;
  });

  protected formatDate(date: string | null): string {
    if (!date) {
      return 'No date';
    }
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
