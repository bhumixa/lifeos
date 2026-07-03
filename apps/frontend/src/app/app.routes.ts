import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

/**
 * Every non-auth route renders inside layout/shell/shell.ts. Sections whose feature module
 * hasn't been built yet (see docs/09-roadmap.md for the phase each one belongs to) use the
 * shared FeaturePlaceholder component; Tasks (Milestone 4), Routines (Milestone 5), and Habits
 * (Milestone 6) each have a real feature module, lazy-loaded via their own `*Routes`.
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
        data: { breadcrumb: 'Schedule', icon: 'calendar_month' },
        loadComponent: () =>
          import('./shared/components/feature-placeholder/feature-placeholder').then((m) => m.FeaturePlaceholder),
      },
      {
        path: 'habits',
        loadChildren: () => import('./features/habits/habits.routes').then((m) => m.habitsRoutes),
      },
      {
        path: 'journal',
        data: { breadcrumb: 'Journal', icon: 'book' },
        loadComponent: () =>
          import('./shared/components/feature-placeholder/feature-placeholder').then((m) => m.FeaturePlaceholder),
      },
      {
        path: 'ai-coach',
        data: { breadcrumb: 'AI Coach', icon: 'psychology' },
        loadComponent: () =>
          import('./shared/components/feature-placeholder/feature-placeholder').then((m) => m.FeaturePlaceholder),
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
