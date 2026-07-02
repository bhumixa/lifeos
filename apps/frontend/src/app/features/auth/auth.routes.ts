import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guest.guard';

export const authRoutes: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () => import('../../layout/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      { path: 'login', loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage) },
      {
        path: 'register',
        loadComponent: () => import('./pages/register-page/register-page').then((m) => m.RegisterPage),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/forgot-password-page/forgot-password-page').then((m) => m.ForgotPasswordPage),
      },
    ],
  },
];
