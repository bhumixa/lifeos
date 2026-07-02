import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { HealthCheckResponse } from '@lifeos/shared-types';
import { AuthService } from '../../../core/auth/auth.service';
import { HealthService } from '../../../core/services/health.service';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * Placeholder landing page for authenticated users. Stands in for the real dashboard shell
 * (nav/sidenav — Phase 1 of docs/09-roadmap.md) that a later milestone builds; this page's job
 * for Milestone 2 is just to prove authGuard, the token interceptor, and the session survive a
 * full login → protected-request → logout cycle. Also keeps the Milestone 1 health check alive
 * as a visible, authenticated API call.
 */
@Component({
  selector: 'app-home-page',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly authService = inject(AuthService);
  private readonly healthService = inject(HealthService);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);

  protected readonly user = this.authService.user;
  protected readonly health = signal<HealthCheckResponse | null>(null);
  protected readonly healthError = signal<string | null>(null);
  protected readonly isLoggingOut = signal(false);

  constructor() {
    this.healthService.check().subscribe({
      next: (result) => this.health.set(result),
      error: () => this.healthError.set('Could not reach the backend API.'),
    });
  }

  protected logout(): void {
    this.isLoggingOut.set(true);
    this.authService.logout().subscribe({
      complete: () => void this.router.navigate(['/login']),
    });
  }
}
