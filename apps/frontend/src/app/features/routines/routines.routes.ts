import { Routes } from '@angular/router';

// 'new' must be declared before ':id' — both are single-segment paths, and Angular's router
// matches in declaration order, so ':id' would otherwise swallow '/routines/new' as if "new"
// were an id.
export const routinesRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Routines' },
    loadComponent: () => import('./pages/routine-list-page/routine-list-page').then((m) => m.RoutineListPage),
  },
  {
    path: 'new',
    data: { breadcrumb: 'New Routine' },
    loadComponent: () => import('./pages/routine-editor-page/routine-editor-page').then((m) => m.RoutineEditorPage),
  },
  {
    path: ':id/edit',
    data: { breadcrumb: 'Edit Routine' },
    loadComponent: () => import('./pages/routine-editor-page/routine-editor-page').then((m) => m.RoutineEditorPage),
  },
  {
    path: ':id',
    data: { breadcrumb: 'Routine Details' },
    loadComponent: () => import('./pages/routine-detail-page/routine-detail-page').then((m) => m.RoutineDetailPage),
  },
];
