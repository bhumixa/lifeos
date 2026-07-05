import { Injectable, inject } from '@angular/core';
import type { AiInsight } from '@lifeos/shared-types';
import { map, type Observable } from 'rxjs';
import { AiApiService } from '../../ai/services/ai-api.service';
import { isRiskInsight } from '../../ai/utils/ai-display';

export interface DashboardAiSummary {
  activeInsightCount: number;
  topRecommendation: AiInsight | null;
  productivityTrend: AiInsight | null;
  riskAlerts: AiInsight[];
}

/** Derives the Dashboard's four AI Coach widgets (AI Summary, Top Recommendation, Productivity
 * Trend, Risk Alerts) from one `GET /ai/insights` call — the same "derived via local computation,
 * no dedicated backend endpoint" shape DashboardGoalsService/DashboardNotificationsService already
 * establish, per docs/05-architecture.md's Dashboard Rules. `pageSize: 20` is a documented display
 * cap, not a real pagination need, matching DashboardGoalsService's own `pageSize: 100` precedent
 * for the same reason. Top Recommendation is the highest-confidence ACTIVE insight; Productivity
 * Trend is the PRODUCTIVITY-type one specifically; Risk Alerts is every insight whose
 * `sourceData.flags` includes `'risk'` (see ai-display.ts's `isRiskInsight`) — this widget never
 * needs its own endpoint precisely because that flag is already part of every insight's stored
 * `sourceData`. */
@Injectable({ providedIn: 'root' })
export class DashboardAiService {
  private readonly aiApi = inject(AiApiService);

  load(): Observable<DashboardAiSummary> {
    return this.aiApi.listInsights({ status: 'ACTIVE', pageSize: 20 }).pipe(
      map(({ data: insights }) => {
        const topRecommendation =
          [...insights].sort((a, b) => b.confidence - a.confidence)[0] ?? null;

        return {
          activeInsightCount: insights.length,
          topRecommendation,
          productivityTrend: insights.find((insight) => insight.type === 'PRODUCTIVITY') ?? null,
          riskAlerts: insights.filter((insight) => isRiskInsight(insight.sourceData)),
        };
      }),
    );
  }
}
