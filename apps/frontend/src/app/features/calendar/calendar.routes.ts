import { Routes } from '@angular/router';

// 'month'/'week'/'day'/'settings' are literal segments, declared before 'day/:date' — same
// literal-before-param convention every other feature's routes already document (see
// habits.routes.ts/journal.routes.ts).
export const calendarRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Calendar' },
    loadComponent: () =>
      import('./pages/calendar-dashboard-page/calendar-dashboard-page').then((m) => m.CalendarDashboardPage),
  },
  {
    path: 'month',
    data: { breadcrumb: 'Month View' },
    loadComponent: () => import('./pages/month-view-page/month-view-page').then((m) => m.MonthViewPage),
  },
  {
    path: 'week',
    data: { breadcrumb: 'Week View' },
    loadComponent: () => import('./pages/week-view-page/week-view-page').then((m) => m.WeekViewPage),
  },
  {
    path: 'settings',
    data: { breadcrumb: 'Calendar Settings' },
    loadComponent: () =>
      import('./pages/calendar-settings-page/calendar-settings-page').then((m) => m.CalendarSettingsPage),
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
];
