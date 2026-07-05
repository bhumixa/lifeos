import { Routes } from '@angular/router';

/** Mounted at the pre-existing `/analytics` path (see app.routes.ts) — that nav item already
 * existed pointing at the shared FeaturePlaceholder, the same "reuse an existing nav item, no nav
 * change needed" precedent Habits/Journal/AI Coach already set. */
export const analyticsRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Analytics' },
    loadComponent: () =>
      import('./pages/analytics-dashboard-page/analytics-dashboard-page').then((m) => m.AnalyticsDashboardPage),
  },
  {
    path: 'reports',
    data: { breadcrumb: 'Reports' },
    loadComponent: () => import('./pages/reports-page/reports-page').then((m) => m.ReportsPage),
  },
  {
    path: 'exports',
    data: { breadcrumb: 'Exports' },
    loadComponent: () => import('./pages/exports-page/exports-page').then((m) => m.ExportsPage),
  },
];
