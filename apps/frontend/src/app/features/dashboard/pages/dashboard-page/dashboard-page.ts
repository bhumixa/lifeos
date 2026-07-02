import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map, startWith } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { QuickActions } from '../../components/quick-actions/quick-actions';
import { RecentActivity } from '../../components/recent-activity/recent-activity';
import { DashboardTaskStatsService } from '../../services/dashboard-task-stats.service';

interface DashboardStat {
  label: string;
  value: string;
  icon: string;
}

// Habits/streaks/focus-time modules don't exist yet, so these stay placeholders — only the task
// stats (wired in ngOnInit below) show real numbers as of Milestone 4.
const PLACEHOLDER_STATS: DashboardStat[] = [
  { label: 'Habits Completed', value: '—', icon: 'repeat' },
  { label: 'Current Streak', value: '—', icon: 'local_fire_department' },
  { label: 'Focus Time', value: '—', icon: 'timer' },
];

@Component({
  selector: 'app-dashboard-page',
  imports: [Skeleton, StatCard, QuickActions, RecentActivity],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardTaskStats = inject(DashboardTaskStatsService);

  protected readonly user = this.authService.user;
  protected readonly placeholderStats = PLACEHOLDER_STATS;

  protected readonly taskStatsLoading = signal(true);
  protected readonly taskStats = signal<DashboardStat[]>([
    { label: "Today's Tasks", value: '—', icon: 'checklist' },
    { label: 'Upcoming Tasks', value: '—', icon: 'upcoming' },
    { label: 'Completed Today', value: '—', icon: 'task_alt' },
  ]);

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

  ngOnInit(): void {
    this.dashboardTaskStats.load().subscribe({
      next: (stats) => {
        this.taskStats.set([
          { label: "Today's Tasks", value: String(stats.todayCount), icon: 'checklist' },
          { label: 'Upcoming Tasks', value: String(stats.upcomingCount), icon: 'upcoming' },
          { label: 'Completed Today', value: String(stats.completedTodayCount), icon: 'task_alt' },
        ]);
        this.taskStatsLoading.set(false);
      },
      // Falls back to the "—" placeholders already set above — a stats-loading failure
      // shouldn't block the rest of the dashboard from rendering.
      error: () => this.taskStatsLoading.set(false),
    });
  }

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
