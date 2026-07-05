import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { InsightFeed } from '../../components/insight-feed/insight-feed';
import { InsightFilterChange, InsightFilters } from '../../components/insight-filters/insight-filters';
import { AiInsightsStore } from '../../state/ai-insights-store';

/** The full, filterable AI Insights list — GET /ai/insights with every filter/sort/pagination
 * option, the same "richer list page" role Habit History/Journal History already play alongside
 * their own feature's lighter Dashboard summary. */
@Component({
  selector: 'app-ai-insights-page',
  imports: [MatButtonModule, MatIconModule, MatPaginatorModule, InsightFilters, InsightFeed],
  templateUrl: './ai-insights-page.html',
  styleUrl: './ai-insights-page.scss',
})
export class AiInsightsPage implements OnInit {
  private readonly store = inject(AiInsightsStore);

  protected readonly insights = this.store.insights;
  protected readonly meta = this.store.meta;
  protected readonly loading = this.store.loading;
  protected readonly generating = this.store.generating;
  protected readonly error = this.store.error;

  ngOnInit(): void {
    this.store.load();
  }

  protected onFilterChanged(change: InsightFilterChange): void {
    this.store.setQuery(change);
  }

  protected onCleared(): void {
    this.store.resetFilters();
  }

  protected onPage(event: PageEvent): void {
    this.store.setQuery({ page: event.pageIndex + 1, pageSize: event.pageSize });
  }

  protected generate(): void {
    this.store.generate();
  }
}
