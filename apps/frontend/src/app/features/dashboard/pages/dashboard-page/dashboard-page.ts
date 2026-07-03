import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { PlannerDay } from '@lifeos/shared-types';
import { interval, map, startWith } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { formatDuration } from '../../../planner/utils/planner-display';
import { computePlannerSummary } from '../../../planner/utils/planner-summary';
import { HabitsQuickComplete } from '../../components/habits-quick-complete/habits-quick-complete';
import { PlannerTimelineCard } from '../../components/planner-timeline-card/planner-timeline-card';
import { QuickActions } from '../../components/quick-actions/quick-actions';
import { RecentActivity } from '../../components/recent-activity/recent-activity';
import { RoutineSummaryCard } from '../../components/routine-summary/routine-summary';
import { DashboardHabitStatsService } from '../../services/dashboard-habit-stats.service';
import { DashboardPlannerService } from '../../services/dashboard-planner.service';
import { DashboardStreaksService } from '../../services/dashboard-streaks.service';
import { DashboardTaskStatsService } from '../../services/dashboard-task-stats.service';

interface DashboardStat {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    Skeleton,
    StatCard,
    QuickActions,
    RoutineSummaryCard,
    HabitsQuickComplete,
    PlannerTimelineCard,
    RecentActivity,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardTaskStats = inject(DashboardTaskStatsService);
  private readonly dashboardHabitStats = inject(DashboardHabitStatsService);
  private readonly dashboardPlanner = inject(DashboardPlannerService);
  private readonly dashboardStreaks = inject(DashboardStreaksService);

  protected readonly user = this.authService.user;

  protected readonly taskStatsLoading = signal(true);
  protected readonly taskStats = signal<DashboardStat[]>([
    { label: "Today's Tasks", value: '—', icon: 'checklist' },
    { label: 'Upcoming Tasks', value: '—', icon: 'upcoming' },
    { label: 'Completed Today', value: '—', icon: 'task_alt' },
  ]);

  protected readonly habitStatsLoading = signal(true);
  protected readonly habitStats = signal<DashboardStat[]>([
    { label: 'Habits Completed Today', value: '—', icon: 'repeat' },
    { label: 'Total Active Habits', value: '—', icon: 'checklist_rtl' },
    { label: 'Completion Percentage', value: '—', icon: 'percent' },
  ]);

  protected readonly streaksStatsLoading = signal(true);
  protected readonly streaksStats = signal<DashboardStat[]>([
    { label: 'Current Streak', value: '—', icon: 'local_fire_department' },
    { label: 'Longest Streak', value: '—', icon: 'emoji_events' },
    { label: 'XP Earned', value: '—', icon: 'bolt' },
    { label: 'Achievements', value: '—', icon: 'workspace_premium' },
    { label: 'Weekly Success', value: '—', icon: 'calendar_view_week' },
    { label: 'Monthly Success', value: '—', icon: 'calendar_month' },
    { label: 'Consistency', value: '—', icon: 'percent' },
  ]);

  protected readonly plannerLoading = signal(true);
  private readonly plannerDay = signal<PlannerDay | null>(null);
  protected readonly plannerBlocks = computed(() => this.plannerDay()?.blocks ?? []);

  // Ticks once a minute — enough resolution for a "current time" readout without re-rendering
  // every second for no visible benefit.
  private readonly now = toSignal(
    interval(60_000).pipe(
      startWith(0),
      map(() => new Date()),
    ),
    { initialValue: new Date() },
  );

  // Depends on `now()`, unlike taskStats/habitStats — Next Activity/Remaining Time are only
  // meaningful relative to the current moment, not a value computed once at page load.
  protected readonly plannerStats = computed<DashboardStat[]>(() => {
    const summary = computePlannerSummary(this.plannerBlocks(), this.now());
    return [
      { label: 'Next Activity', value: summary.nextBlock?.title ?? 'Nothing scheduled', icon: 'upcoming' },
      { label: 'Remaining Time', value: formatDuration(summary.remainingMinutes), icon: 'hourglass_bottom' },
      { label: 'Focus Time', value: formatDuration(summary.focusMinutes), icon: 'timer' },
      {
        label: 'Completed Blocks',
        value: `${summary.completedCount} / ${this.plannerBlocks().length}`,
        icon: 'task_alt',
      },
    ];
  });

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

    this.dashboardHabitStats.load().subscribe({
      next: (stats) => {
        this.habitStats.set([
          { label: 'Habits Completed Today', value: String(stats.habitsCompletedToday), icon: 'repeat' },
          { label: 'Total Active Habits', value: String(stats.totalActiveHabits), icon: 'checklist_rtl' },
          { label: 'Completion Percentage', value: `${stats.completionPercentage}%`, icon: 'percent' },
        ]);
        this.habitStatsLoading.set(false);
      },
      error: () => this.habitStatsLoading.set(false),
    });

    this.dashboardPlanner.load().subscribe({
      next: (day) => {
        this.plannerDay.set(day);
        this.plannerLoading.set(false);
      },
      error: () => this.plannerLoading.set(false),
    });

    this.dashboardStreaks.load().subscribe({
      next: (stats) => {
        this.streaksStats.set([
          { label: 'Current Streak', value: String(stats.currentStreak), icon: 'local_fire_department' },
          { label: 'Longest Streak', value: String(stats.longestStreak), icon: 'emoji_events' },
          { label: 'XP Earned', value: String(stats.xpEarned), icon: 'bolt' },
          { label: 'Achievements', value: String(stats.achievementsUnlockedCount), icon: 'workspace_premium' },
          { label: 'Weekly Success', value: `${stats.weeklyConsistency}%`, icon: 'calendar_view_week' },
          { label: 'Monthly Success', value: `${stats.monthlyConsistency}%`, icon: 'calendar_month' },
          { label: 'Consistency', value: `${stats.successRate}%`, icon: 'percent' },
        ]);
        this.streaksStatsLoading.set(false);
      },
      error: () => this.streaksStatsLoading.set(false),
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
