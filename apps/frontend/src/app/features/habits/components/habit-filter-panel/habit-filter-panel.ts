import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import type { HabitFrequency, HabitSortBy, SortOrder } from '@lifeos/shared-types';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FREQUENCY_LABELS } from '../../utils/habit-display';

export interface HabitFilterChange {
  search?: string;
  isActive?: boolean;
  targetFrequency?: HabitFrequency;
  category?: string;
  sortBy?: HabitSortBy;
  sortOrder?: SortOrder;
}

type ActiveFilter = 'all' | 'active' | 'inactive';

/** Search/filter/sort controls for the Habit List page — same "emits one event per change,
 * owns no query state itself" shape as TaskToolbar. */
@Component({
  selector: 'app-habit-filter-panel',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './habit-filter-panel.html',
  styleUrl: './habit-filter-panel.scss',
})
export class HabitFilterPanel {
  protected readonly frequencies = Object.entries(FREQUENCY_LABELS) as [HabitFrequency, string][];

  protected searchTerm = '';
  protected activeFilter: ActiveFilter = 'all';
  protected targetFrequency: HabitFrequency | '' = '';
  protected category = '';
  protected sortBy: HabitSortBy = 'createdAt';
  protected sortOrder: SortOrder = 'desc';

  readonly filterChanged = output<HabitFilterChange>();

  private readonly searchInput$ = new Subject<string>();
  private readonly categoryInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((search) => {
      this.filterChanged.emit({ search: search || undefined });
    });
    this.categoryInput$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((category) => {
      this.filterChanged.emit({ category: category || undefined });
    });
  }

  protected onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchInput$.next(value);
  }

  protected onCategoryInput(value: string): void {
    this.category = value;
    this.categoryInput$.next(value);
  }

  protected onActiveFilterChange(value: ActiveFilter): void {
    this.activeFilter = value;
    this.filterChanged.emit({ isActive: value === 'all' ? undefined : value === 'active' });
  }

  protected onFrequencyChange(value: HabitFrequency | ''): void {
    this.targetFrequency = value;
    this.filterChanged.emit({ targetFrequency: value || undefined });
  }

  protected onSortByChange(value: HabitSortBy): void {
    this.sortBy = value;
    this.filterChanged.emit({ sortBy: value });
  }

  protected onSortOrderToggle(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.filterChanged.emit({ sortOrder: this.sortOrder });
  }
}
