import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    // Attempts to silently restore a session from the httpOnly refresh cookie before the router
    // activates any route, so authGuard/guestGuard see accurate state on the very first navigation
    // (otherwise a hard reload on a protected route would briefly look "logged out").
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return firstValueFrom(authService.tryRestoreSession()).then(() => undefined);
    }),
  ],
};
