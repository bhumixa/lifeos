import { Routes } from '@angular/router';

export const tasksRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Tasks' },
    loadComponent: () => import('./pages/task-list-page/task-list-page').then((m) => m.TaskListPage),
  },
  {
    path: ':id',
    data: { breadcrumb: 'Task Details' },
    loadComponent: () => import('./pages/task-detail-page/task-detail-page').then((m) => m.TaskDetailPage),
  },
];
