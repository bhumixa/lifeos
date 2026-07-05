import { Component, input, output } from '@angular/core';
import type { AiInsight } from '@lifeos/shared-types';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { Skeleton } from '../../../../shared/components/skeleton/skeleton';
import { InsightCard } from '../insight-card/insight-card';

/** Renders a list of insights with loading/empty states — shared by the AI Dashboard's own feed
 * and the AI Insights page's full list, the same "one list-rendering primitive, several
 * consumers" role NotificationList already plays for NotificationTimeline/RecentActivity. */
@Component({
  selector: 'app-insight-feed',
  imports: [Skeleton, EmptyState, InsightCard],
  templateUrl: './insight-feed.html',
  styleUrl: './insight-feed.scss',
})
export class InsightFeed {
  readonly insights = input.required<AiInsight[]>();
  readonly loading = input(false);

  readonly opened = output<string>();
}
