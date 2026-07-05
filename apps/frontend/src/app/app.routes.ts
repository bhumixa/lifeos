import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

/**
 * Every non-auth route renders inside layout/shell/shell.ts. Sections whose feature module
 * hasn't been built yet (see docs/09-roadmap.md for the phase each one belongs to) use the
 * shared FeaturePlaceholder component; Tasks (Milestone 4), Routines (Milestone 5), Habits
 * (Milestone 6), the Daily Planner (Milestone 7, mounted at the pre-existing `schedule` path
 * rather than a new `planner` one — that nav item already existed pointing at this placeholder),
 * Streaks (Milestone 8) and Goals (Milestone 9) each added a new nav item — no pre-existing
 * placeholder pointed at `/streaks` or `/goals` to reuse. Journal (Milestone 10) reused the
 * `Journal` nav item that was already in Milestone 3's original list (like Habits before it), so
 * no nav change was needed — just replacing its placeholder with a real `loadChildren`. Calendar
 * (Milestone 11) added a new `/calendar` nav item — no pre-existing placeholder pointed at it.
 * Notifications (Milestone 12) likewise added a new `/notifications` nav item — its Notification
 * Center is also reachable via the Navbar's own NotificationBell "View all" link, but gets a real
 * nav item too for direct discoverability, matching every other built feature. AI Coach
 * (Milestone 13) reused the `AI Coach` nav item already in Milestone 3's original list (like
 * Habits/Journal before it), so no nav change was needed — just replacing its placeholder with a
 * real `loadChildren`.
 * Each of these has a real feature module, lazy-loaded via their own `*Routes`.
 * `data.breadcrumb`/`data.icon` feed both the sidenav (layout/sidenav/nav-items.ts) and
 * BreadcrumbService — keep labels in sync with nav-items.ts.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'dashboard',
        data: { breadcrumb: 'Dashboard' },
        loadComponent: () => import('./features/dashboard/pages/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'tasks',
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.tasksRoutes),
      },
      {
        path: 'routines',
        loadChildren: () => import('./features/routines/routines.routes').then((m) => m.routinesRoutes),
      },
      {
        path: 'schedule',
        loadChildren: () => import('./features/planner/planner.routes').then((m) => m.plannerRoutes),
      },
      {
        path: 'habits',
        loadChildren: () => import('./features/habits/habits.routes').then((m) => m.habitsRoutes),
      },
      {
        path: 'streaks',
        loadChildren: () => import('./features/streaks/streaks.routes').then((m) => m.streaksRoutes),
      },
      {
        path: 'goals',
        loadChildren: () => import('./features/goals/goals.routes').then((m) => m.goalsRoutes),
      },
      {
        path: 'journal',
        loadChildren: () => import('./features/journal/journal.routes').then((m) => m.journalRoutes),
      },
      {
        path: 'calendar',
        loadChildren: () => import('./features/calendar/calendar.routes').then((m) => m.calendarRoutes),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./features/notifications/notifications.routes').then((m) => m.notificationsRoutes),
      },
      {
        path: 'ai-coach',
        loadChildren: () => import('./features/ai/ai.routes').then((m) => m.aiRoutes),
      },
      {
        path: 'analytics',
        data: { breadcrumb: 'Analytics', icon: 'insights' },
        loadComponent: () =>
          import('./shared/components/feature-placeholder/feature-placeholder').then((m) => m.FeaturePlaceholder),
      },
      {
        path: 'settings',
        data: { breadcrumb: 'Settings', icon: 'settings' },
        loadComponent: () =>
          import('./shared/components/feature-placeholder/feature-placeholder').then((m) => m.FeaturePlaceholder),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
