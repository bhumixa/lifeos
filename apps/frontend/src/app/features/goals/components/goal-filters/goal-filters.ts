import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { GoalPriority, GoalSortBy, GoalStatus, GoalTargetType, SortOrder } from '@lifeos/shared-types';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PRIORITY_LABELS, STATUS_LABELS, TARGET_TYPE_LABELS } from '../../utils/goal-display';

export interface GoalFilterChange {
  search?: string;
  status?: GoalStatus;
  priority?: GoalPriority;
  targetType?: GoalTargetType;
  archived?: boolean;
  sortBy?: GoalSortBy;
  sortOrder?: SortOrder;
}

/** Search/filter/sort controls for the Goals Dashboard — same "emits one event per change, owns
 * no query state itself" shape as HabitFilterPanel/TaskToolbar. */
@Component({
  selector: 'app-goal-filters',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './goal-filters.html',
  styleUrl: './goal-filters.scss',
})
export class GoalFilters {
  protected readonly statuses = Object.entries(STATUS_LABELS) as [GoalStatus, string][];
  protected readonly priorities = Object.entries(PRIORITY_LABELS) as [GoalPriority, string][];
  protected readonly targetTypes = Object.entries(TARGET_TYPE_LABELS) as [GoalTargetType, string][];

  protected searchTerm = '';
  protected status: GoalStatus | '' = '';
  protected priority: GoalPriority | '' = '';
  protected targetType: GoalTargetType | '' = '';
  protected showArchived = false;
  protected sortBy: GoalSortBy = 'createdAt';
  protected sortOrder: SortOrder = 'desc';

  readonly filterChanged = output<GoalFilterChange>();

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((search) => {
      this.filterChanged.emit({ search: search || undefined });
    });
  }

  protected onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchInput$.next(value);
  }

  protected onStatusChange(value: GoalStatus | ''): void {
    this.status = value;
    this.filterChanged.emit({ status: value || undefined });
  }

  protected onPriorityChange(value: GoalPriority | ''): void {
    this.priority = value;
    this.filterChanged.emit({ priority: value || undefined });
  }

  protected onTargetTypeChange(value: GoalTargetType | ''): void {
    this.targetType = value;
    this.filterChanged.emit({ targetType: value || undefined });
  }

  protected onArchivedToggle(value: boolean): void {
    this.showArchived = value;
    this.filterChanged.emit({ archived: value });
  }

  protected onSortByChange(value: GoalSortBy): void {
    this.sortBy = value;
    this.filterChanged.emit({ sortBy: value });
  }

  protected onSortOrderToggle(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.filterChanged.emit({ sortOrder: this.sortOrder });
  }
}
