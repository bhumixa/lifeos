import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * Stands in for a nav section whose feature module hasn't been built yet (Tasks, Schedule,
 * Habits, Journal, AI Coach, Analytics, Settings — all future milestones per docs/09-roadmap.md).
 * Reads `title`/`icon` from route data so one component serves every unbuilt section instead of
 * seven near-identical empty pages — see app.routes.ts. Milestone 3 is shell/navigation only, so
 * this is intentionally inert: no data, no actions, just confirms navigation resolves correctly.
 */
@Component({
  selector: 'app-feature-placeholder',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './feature-placeholder.html',
  styleUrl: './feature-placeholder.scss',
})
export class FeaturePlaceholder {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = this.route.snapshot.data['breadcrumb'] as string;
  protected readonly icon = this.route.snapshot.data['icon'] as string;
}
