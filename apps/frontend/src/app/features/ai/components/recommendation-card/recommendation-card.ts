import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { AiInsight } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { INSIGHT_TYPE_ICONS } from '../../utils/ai-display';

/** The Dashboard's "Top Recommendation" widget — the single highest-confidence ACTIVE insight,
 * chosen by DashboardAiService (see its class doc), rendered prominently. Distinct from
 * InsightCard: this is a highlighted single recommendation, not one row in a list. */
@Component({
  selector: 'app-recommendation-card',
  imports: [MatIconModule, EmptyState],
  templateUrl: './recommendation-card.html',
  styleUrl: './recommendation-card.scss',
})
export class RecommendationCard {
  readonly insight = input<AiInsight | null>(null);

  protected readonly typeIcons = INSIGHT_TYPE_ICONS;
}
