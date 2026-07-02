import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../core/services/theme.service';

/**
 * Shell wrapping the auth feature's pages (login/register/forgot-password) — a centered card on
 * a branded background, distinct from the main app shell (nav/sidenav) that a later milestone
 * builds for authenticated routes.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, MatButtonModule, MatIconModule],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {
  protected readonly themeService = inject(ThemeService);
}
