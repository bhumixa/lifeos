import { Routes } from '@angular/router';

// 'day'/'day/:date'/'week' are literal-then-optional segments, declared before nothing needs to
// disambiguate here (Planner has no ':id' route to collide with, unlike Tasks/Routines/Habits).
export const plannerRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Schedule' },
    loadComponent: () =>
      import('./pages/planner-dashboard-page/planner-dashboard-page').then((m) => m.PlannerDashboardPage),
  },
  {
    path: 'day',
    data: { breadcrumb: 'Day View' },
    loadComponent: () => import('./pages/day-view-page/day-view-page').then((m) => m.DayViewPage),
  },
  {
    path: 'day/:date',
    data: { breadcrumb: 'Day View' },
    loadComponent: () => import('./pages/day-view-page/day-view-page').then((m) => m.DayViewPage),
  },
  {
    path: 'week',
    data: { breadcrumb: 'Week View' },
    loadComponent: () => import('./pages/week-view-page/week-view-page').then((m) => m.WeekViewPage),
  },
];
