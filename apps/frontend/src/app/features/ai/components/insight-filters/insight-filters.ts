import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import type { InsightStatus, InsightType } from '@lifeos/shared-types';
import { INSIGHT_TYPE_LABELS } from '../../utils/ai-display';

export interface InsightFilterChange {
  type?: InsightType;
  status?: InsightStatus;
}

const STATUS_LABELS: Record<InsightStatus, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  DISMISSED: 'Dismissed',
};

/** Filter controls for the AI Insights page — same "emits one event per change, owns no query
 * state itself" shape NotificationFilter/GoalFilters already establish. */
@Component({
  selector: 'app-insight-filters',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './insight-filters.html',
  styleUrl: './insight-filters.scss',
})
export class InsightFilters {
  protected readonly types = Object.entries(INSIGHT_TYPE_LABELS) as [InsightType, string][];
  protected readonly statuses = Object.entries(STATUS_LABELS) as [InsightStatus, string][];

  protected type: InsightType | '' = '';
  protected status: InsightStatus | '' = '';

  readonly filterChanged = output<InsightFilterChange>();
  readonly cleared = output<void>();

  protected onTypeChange(value: InsightType | ''): void {
    this.type = value;
    this.filterChanged.emit({ type: value || undefined });
  }

  protected onStatusChange(value: InsightStatus | ''): void {
    this.status = value;
    this.filterChanged.emit({ status: value || undefined });
  }

  protected clear(): void {
    this.type = '';
    this.status = '';
    this.cleared.emit();
  }
}
