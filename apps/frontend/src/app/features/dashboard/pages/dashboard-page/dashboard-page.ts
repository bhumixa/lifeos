import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Notification, PlannerDay } from '@lifeos/shared-types';
import { interval, map, startWith } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { formatDuration } from '../../../planner/utils/planner-display';
import { computePlannerSummary } from '../../../planner/utils/planner-summary';
import { CalendarScheduleCard } from '../../components/calendar-schedule-card/calendar-schedule-card';
import { HabitsQuickComplete } from '../../components/habits-quick-complete/habits-quick-complete';
import { PlannerTimelineCard } from '../../components/planner-timeline-card/planner-timeline-card';
import { QuickActions } from '../../components/quick-actions/quick-actions';
import { RecentActivity } from '../../components/recent-activity/recent-activity';
import { RoutineSummaryCard } from '../../components/routine-summary/routine-summary';
import { DashboardCalendarService, type DashboardScheduleItem } from '../../services/dashboard-calendar.service';
import { DashboardGoalsService } from '../../services/dashboard-goals.service';
import { DashboardHabitStatsService } from '../../services/dashboard-habit-stats.service';
import { DashboardJournalService } from '../../services/dashboard-journal.service';
import { DashboardNotificationsService } from '../../services/dashboard-notifications.service';
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
    CalendarScheduleCard,
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
  private readonly dashboardGoals = inject(DashboardGoalsService);
  private readonly dashboardJournal = inject(DashboardJournalService);
  private readonly dashboardCalendar = inject(DashboardCalendarService);
  private readonly dashboardNotifications = inject(DashboardNotificationsService);

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

  protected readonly goalsStatsLoading = signal(true);
  protected readonly goalsStats = signal<DashboardStat[]>([
    { label: 'Active Goals', value: '—', icon: 'flag' },
    { label: "Today's Goal Progress", value: '—', icon: 'trending_up' },
    { label: 'Goal Completion %', value: '—', icon: 'percent' },
    { label: 'Nearest Goal Deadline', value: '—', icon: 'event' },
  ]);

  protected readonly journalStatsLoading = signal(true);
  protected readonly journalStats = signal<DashboardStat[]>([
    { label: "Today's Journal Status", value: '—', icon: 'edit_note' },
    { label: 'Morning Reflection', value: '—', icon: 'wb_sunny' },
    { label: 'Evening Reflection', value: '—', icon: 'nights_stay' },
    { label: 'Current Mood', value: '—', icon: 'mood' },
    { label: 'Last Gratitude', value: '—', icon: 'volunteer_activism' },
    { label: 'Latest Reflection', value: '—', icon: 'auto_stories' },
  ]);

  protected readonly plannerLoading = signal(true);
  private readonly plannerDay = signal<PlannerDay | null>(null);
  protected readonly plannerBlocks = computed(() => this.plannerDay()?.blocks ?? []);

  protected readonly calendarStatsLoading = signal(true);
  protected readonly calendarStats = signal<DashboardStat[]>([
    { label: "Today's Events", value: '—', icon: 'event' },
    { label: 'Upcoming Events', value: '—', icon: 'event_upcoming' },
    { label: 'Calendar Overview', value: '—', icon: 'calendar_month' },
  ]);
  protected readonly calendarScheduleLoading = signal(true);
  protected readonly calendarSchedule = signal<DashboardScheduleItem[]>([]);

  protected readonly notificationsStatsLoading = signal(true);
  protected readonly notificationsStats = signal<DashboardStat[]>([
    { label: 'Unread Notifications', value: '—', icon: 'mark_email_unread' },
    { label: 'Upcoming Reminders', value: '—', icon: 'upcoming' },
  ]);
  protected readonly recentActivityLoading = signal(true);
  protected readonly recentNotifications = signal<Notification[]>([]);

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

    this.dashboardGoals.load().subscribe({
      next: (stats) => {
        this.goalsStats.set([
          { label: 'Active Goals', value: String(stats.activeCount), icon: 'flag' },
          { label: "Today's Goal Progress", value: `${stats.averageProgressPercent}%`, icon: 'trending_up' },
          { label: 'Goal Completion %', value: `${stats.completionPercentage}%`, icon: 'percent' },
          {
            label: 'Nearest Goal Deadline',
            value: stats.nearestDeadline
              ? new Date(stats.nearestDeadline.targetDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : 'None',
            icon: 'event',
          },
        ]);
        this.goalsStatsLoading.set(false);
      },
      error: () => this.goalsStatsLoading.set(false),
    });

    this.dashboardJournal.load().subscribe({
      next: (summary) => {
        const doneCount = Number(summary.hasMorningToday) + Number(summary.hasEveningToday);
        this.journalStats.set([
          {
            label: "Today's Journal Status",
            value: doneCount === 2 ? 'Both done' : doneCount === 1 ? '1 of 2 done' : 'Not started',
            icon: 'edit_note',
          },
          { label: 'Morning Reflection', value: summary.hasMorningToday ? 'Done' : 'Not yet', icon: 'wb_sunny' },
          { label: 'Evening Reflection', value: summary.hasEveningToday ? 'Done' : 'Not yet', icon: 'nights_stay' },
          { label: 'Current Mood', value: summary.currentMood ?? '—', icon: 'mood' },
          { label: 'Last Gratitude', value: summary.lastGratitude ?? '—', icon: 'volunteer_activism' },
          { label: 'Latest Reflection', value: summary.latestReflection?.headline ?? '—', icon: 'auto_stories' },
        ]);
        this.journalStatsLoading.set(false);
      },
      error: () => this.journalStatsLoading.set(false),
    });

    this.dashboardCalendar.load().subscribe({
      next: (summary) => {
        this.calendarStats.set([
          { label: "Today's Events", value: String(summary.todayEventsCount), icon: 'event' },
          { label: 'Upcoming Events', value: String(summary.upcomingEventsCount), icon: 'event_upcoming' },
          {
            label: 'Calendar Overview',
            value: `${summary.enabledCalendarCount} / ${summary.calendarCount} enabled`,
            icon: 'calendar_month',
          },
        ]);
        this.calendarStatsLoading.set(false);
        this.calendarSchedule.set(summary.todaySchedule);
        this.calendarScheduleLoading.set(false);
      },
      error: () => {
        this.calendarStatsLoading.set(false);
        this.calendarScheduleLoading.set(false);
      },
    });

    this.dashboardNotifications.load().subscribe({
      next: (summary) => {
        this.notificationsStats.set([
          { label: 'Unread Notifications', value: String(summary.unreadCount), icon: 'mark_email_unread' },
          { label: 'Upcoming Reminders', value: String(summary.upcomingCount), icon: 'upcoming' },
        ]);
        this.notificationsStatsLoading.set(false);
        this.recentNotifications.set(summary.recent);
        this.recentActivityLoading.set(false);
      },
      error: () => {
        this.notificationsStatsLoading.set(false);
        this.recentActivityLoading.set(false);
      },
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
