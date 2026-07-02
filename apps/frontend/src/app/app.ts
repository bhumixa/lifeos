import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import type { HealthCheckResponse } from '@lifeos/shared-types';
import { HealthService } from './core/services/health.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly healthService = inject(HealthService);

  protected readonly health = signal<HealthCheckResponse | null>(null);
  protected readonly healthError = signal<string | null>(null);

  constructor() {
    this.healthService.check().subscribe({
      next: (result) => this.health.set(result),
      error: () => this.healthError.set('Could not reach the backend API.'),
    });
  }
}
