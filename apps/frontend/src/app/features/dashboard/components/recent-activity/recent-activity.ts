import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import type { Notification } from '@lifeos/shared-types';
import { NotificationList } from '../../../notifications/components/notification-list/notification-list';

/** Was a placeholder, empty-state-only card until the Notification Engine (Milestone 12) gave the
 * Dashboard a real cross-feature activity source: Task/Habit/Planner/Goal/Journal/Achievement
 * completions all already flow into a Notification (see NotificationSchedulerService), so the most
 * recent few notifications — reused directly via NotificationList's own `compact` variant, the
 * same "wrap a sibling feature's exported component" precedent Streaks' WeeklyHeatmap already set
 * for Habits' HabitCalendarHeatmap — are exactly "recent activity" across the whole app, with no
 * new dashboard-specific endpoint. */
@Component({
  selector: 'app-recent-activity',
  imports: [MatCardModule, NotificationList],
  templateUrl: './recent-activity.html',
  styleUrl: './recent-activity.scss',
})
export class RecentActivity {
  readonly notifications = input<Notification[]>([]);
  readonly loading = input(false);
}
