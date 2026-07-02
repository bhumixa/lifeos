import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map, startWith } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { QuickActions } from '../../components/quick-actions/quick-actions';
import { RecentActivity } from '../../components/recent-activity/recent-activity';

interface DashboardStat {
  label: string;
  value: string;
  icon: string;
}

// Placeholder values only — Milestone 3 builds the shell, not task/habit business logic. Real
// numbers arrive once the Tasks/Habits/Streaks/Planner modules exist and can be queried.
const DASHBOARD_STATS: DashboardStat[] = [
  { label: "Today's Tasks", value: '—', icon: 'checklist' },
  { label: 'Habits Completed', value: '—', icon: 'repeat' },
  { label: 'Current Streak', value: '—', icon: 'local_fire_department' },
  { label: 'Focus Time', value: '—', icon: 'timer' },
];

@Component({
  selector: 'app-dashboard-page',
  imports: [StatCard, QuickActions, RecentActivity],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly authService = inject(AuthService);

  protected readonly user = this.authService.user;
  protected readonly stats = DASHBOARD_STATS;

  // Ticks once a minute — enough resolution for a "current time" readout without re-rendering
  // every second for no visible benefit.
  private readonly now = toSignal(
    interval(60_000).pipe(
      startWith(0),
      map(() => new Date()),
    ),
    { initialValue: new Date() },
  );

  protected readonly welcomeMessage = computed(() => {
    const greeting = this.buildGreeting(this.now().getHours());
    const name = this.user()?.name;
    return name ? `${greeting}, ${name}!` : `${greeting}!`;
  });

  protected readonly formattedDate = computed(() =>
    this.now().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  );

  protected readonly formattedTime = computed(() =>
    this.now().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  );

  private buildGreeting(hour: number): string {
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  }
}
