import { Routes } from '@angular/router';

// 'settings' is declared before the (currently nonexistent) bare ':id' route this feature has no
// need for yet — kept literal-first anyway, matching every other feature's route-ordering
// convention, in case a Notification Detail route is ever added later.
export const notificationsRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Notifications' },
    loadComponent: () =>
      import('./pages/notification-center-page/notification-center-page').then((m) => m.NotificationCenterPage),
  },
  {
    path: 'settings',
    data: { breadcrumb: 'Notification Settings' },
    loadComponent: () =>
      import('./pages/notification-settings-page/notification-settings-page').then(
        (m) => m.NotificationSettingsPage,
      ),
  },
];
