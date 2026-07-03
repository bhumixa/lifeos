import { Routes } from '@angular/router';

// 'new' and ':id/edit'/':id/milestones' are declared before the bare ':id' route — same
// literal-before-param rule routines.routes.ts documents ('new' would otherwise be swallowed as
// if it were an id).
export const goalsRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Goals' },
    loadComponent: () => import('./pages/goals-dashboard-page/goals-dashboard-page').then((m) => m.GoalsDashboardPage),
  },
  {
    path: 'new',
    data: { breadcrumb: 'New Goal' },
    loadComponent: () => import('./pages/goal-editor-page/goal-editor-page').then((m) => m.GoalEditorPage),
  },
  {
    path: ':id/edit',
    data: { breadcrumb: 'Edit Goal' },
    loadComponent: () => import('./pages/goal-editor-page/goal-editor-page').then((m) => m.GoalEditorPage),
  },
  {
    path: ':id/milestones',
    data: { breadcrumb: 'Goal Milestones' },
    loadComponent: () => import('./pages/goal-milestones-page/goal-milestones-page').then((m) => m.GoalMilestonesPage),
  },
  {
    path: ':id',
    data: { breadcrumb: 'Goal Details' },
    loadComponent: () => import('./pages/goal-detail-page/goal-detail-page').then((m) => m.GoalDetailPage),
  },
];
