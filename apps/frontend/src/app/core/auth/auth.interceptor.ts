import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Attaches the access token to outgoing API requests and transparently retries once after a 401
 * by exchanging the httpOnly refresh cookie for a new token (see AuthService.refreshAccessToken).
 * Only applies to requests aimed at our own API — never attaches credentials/tokens to
 * third-party requests a future feature might make.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // /auth/* requests either don't need a bearer token (login/register) or would be nonsensical to
  // retry through the same 401-refresh flow (refresh/logout).
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth/`);
  const token = authService.accessToken;

  const authorizedReq = req.clone({
    withCredentials: true,
    ...(token && !isAuthEndpoint ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap(() => {
          const retriedReq = req.clone({
            withCredentials: true,
            setHeaders: { Authorization: `Bearer ${authService.accessToken ?? ''}` },
          });
          return next(retriedReq);
        }),
        catchError((refreshError: unknown) => {
          authService.clearLocalSession();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
