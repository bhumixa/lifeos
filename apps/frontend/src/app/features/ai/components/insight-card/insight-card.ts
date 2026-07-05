import { Component, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { AiInsight } from '@lifeos/shared-types';
import { Badge } from '../../../../shared/components/badge/badge';
import { INSIGHT_TYPE_ICONS, INSIGHT_TYPE_LABELS, isRiskInsight } from '../../utils/ai-display';
import { ConfidenceBadge } from '../confidence-badge/confidence-badge';

/** One generated insight — used by InsightFeed (AI Dashboard) and the AI Insights page's own
 * list, the same "one card component, several consuming pages" role NotificationCard already
 * plays for Notification Center + the Navbar's NotificationBell. "View details" expands the card
 * in place to show `content` (the fuller text) alongside `summary` — no separate detail page/route
 * exists for a single insight, since GET /ai/insights/:id has no other consumer yet; `opened` still
 * emits the id for a parent (e.g. the AI Dashboard) that wants to react to it too. */
@Component({
  selector: 'app-insight-card',
  imports: [MatButtonModule, MatIconModule, Badge, ConfidenceBadge],
  templateUrl: './insight-card.html',
  styleUrl: './insight-card.scss',
})
export class InsightCard {
  readonly insight = input.required<AiInsight>();
  readonly opened = output<string>();

  protected readonly typeIcons = INSIGHT_TYPE_ICONS;
  protected readonly typeLabels = INSIGHT_TYPE_LABELS;
  protected readonly expanded = signal(false);

  protected get isRisk(): boolean {
    return isRiskInsight(this.insight().sourceData);
  }

  protected toggle(): void {
    this.expanded.update((value) => !value);
    this.opened.emit(this.insight().id);
  }
}
