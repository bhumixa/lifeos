import { Routes } from '@angular/router';

// 'today' and 'history' must be declared before ':id' — same rule as routines.routes.ts's
// 'new' vs ':id': both are single-segment paths, and Angular's router matches in declaration
// order, so ':id' would otherwise swallow '/habits/today' and '/habits/history' as ids.
export const habitsRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Habits' },
    loadComponent: () => import('./pages/habit-list-page/habit-list-page').then((m) => m.HabitListPage),
  },
  {
    path: 'today',
    data: { breadcrumb: "Today's Habits" },
    loadComponent: () => import('./pages/today-habits-page/today-habits-page').then((m) => m.TodayHabitsPage),
  },
  {
    path: 'history',
    data: { breadcrumb: 'Habit History' },
    loadComponent: () => import('./pages/habit-history-page/habit-history-page').then((m) => m.HabitHistoryPage),
  },
  {
    path: ':id',
    data: { breadcrumb: 'Habit Details' },
    loadComponent: () => import('./pages/habit-detail-page/habit-detail-page').then((m) => m.HabitDetailPage),
  },
];
