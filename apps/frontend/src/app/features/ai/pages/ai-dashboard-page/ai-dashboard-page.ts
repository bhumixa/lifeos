import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InsightFeed } from '../../components/insight-feed/insight-feed';
import { RecommendationCard } from '../../components/recommendation-card/recommendation-card';
import { AiInsightsStore } from '../../state/ai-insights-store';

/**
 * The AI Coach's own home page — a "Generate" action, a Top Recommendation highlight (the
 * highest-confidence active insight), and a feed of the most recent ones. Distinct from the main
 * app Dashboard's own AI Summary/Risk Alerts widgets (see dashboard-ai.service.ts), the same
 * "feature's own dashboard vs. the app Dashboard's summary of it" split Streaks already
 * establishes between Streak Dashboard and dashboard-streaks.service.ts.
 */
@Component({
  selector: 'app-ai-dashboard-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, InsightFeed, RecommendationCard],
  templateUrl: './ai-dashboard-page.html',
  styleUrl: './ai-dashboard-page.scss',
})
export class AiDashboardPage implements OnInit {
  private readonly store = inject(AiInsightsStore);

  protected readonly insights = this.store.insights;
  protected readonly loading = this.store.loading;
  protected readonly generating = this.store.generating;

  protected readonly topRecommendation = computed(() => {
    const sorted = [...this.insights()].sort((a, b) => b.confidence - a.confidence);
    return sorted[0] ?? null;
  });

  ngOnInit(): void {
    this.store.setQuery({ status: 'ACTIVE', pageSize: 10 });
  }

  protected generate(): void {
    this.store.generate();
  }
}
