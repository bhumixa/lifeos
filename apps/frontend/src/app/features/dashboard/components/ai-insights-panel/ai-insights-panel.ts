import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { AiInsight } from '@lifeos/shared-types';
import { RecommendationCard } from '../../../ai/components/recommendation-card/recommendation-card';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';

/**
 * The Dashboard's Top Recommendation + Risk Alerts widget — composes AI Coach's own
 * RecommendationCard (cross-feature component reuse, the same "compose a sibling's exported
 * component" precedent Notifications' `notification-bell` set for the app shell) rather than a
 * second recommendation-rendering implementation. Risk alerts are a plain, hand-rolled compact
 * list (no charting/list library), matching this codebase's established "no such dependency"
 * convention every other Dashboard widget already follows.
 */
@Component({
  selector: 'app-ai-insights-panel',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, Skeleton, RecommendationCard],
  templateUrl: './ai-insights-panel.html',
  styleUrl: './ai-insights-panel.scss',
})
export class AiInsightsPanel {
  readonly topRecommendation = input<AiInsight | null>(null);
  readonly riskAlerts = input<AiInsight[]>([]);
  readonly loading = input(false);
}
