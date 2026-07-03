import { Routes } from '@angular/router';

// 'achievements' is a literal segment; no ':id'-style route exists in this feature yet to
// conflict with it, but it's still declared explicitly (not nested under '') so its own
// breadcrumb/label is distinct from the Streak Dashboard's.
export const streaksRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Streaks' },
    loadComponent: () =>
      import('./pages/streak-dashboard-page/streak-dashboard-page').then((m) => m.StreakDashboardPage),
  },
  {
    path: 'achievements',
    data: { breadcrumb: 'Achievements' },
    loadComponent: () =>
      import('./pages/achievement-gallery-page/achievement-gallery-page').then((m) => m.AchievementGalleryPage),
  },
];
