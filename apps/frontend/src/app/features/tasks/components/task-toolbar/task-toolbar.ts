import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { SortOrder, TaskPriority, TaskSortBy, TaskStatus } from '@lifeos/shared-types';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../utils/task-display';

export interface TaskFilterChange {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  sortBy?: TaskSortBy;
  sortOrder?: SortOrder;
}

/** Search/filter/sort controls for the Task List page. Emits one event per change rather than
 * owning query state itself — TasksStore is the single source of truth for the active query. */
@Component({
  selector: 'app-task-toolbar',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './task-toolbar.html',
  styleUrl: './task-toolbar.scss',
})
export class TaskToolbar {
  protected readonly statuses = Object.entries(STATUS_LABELS) as [TaskStatus, string][];
  protected readonly priorities = Object.entries(PRIORITY_LABELS) as [TaskPriority, string][];

  protected searchTerm = '';
  protected status: TaskStatus | '' = '';
  protected priority: TaskPriority | '' = '';
  protected sortBy: TaskSortBy = 'createdAt';
  protected sortOrder: SortOrder = 'desc';

  readonly filterChanged = output<TaskFilterChange>();

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

  protected onStatusChange(value: TaskStatus | ''): void {
    this.status = value;
    this.filterChanged.emit({ status: value || undefined });
  }

  protected onPriorityChange(value: TaskPriority | ''): void {
    this.priority = value;
    this.filterChanged.emit({ priority: value || undefined });
  }

  protected onSortByChange(value: TaskSortBy): void {
    this.sortBy = value;
    this.filterChanged.emit({ sortBy: value });
  }

  protected onSortOrderToggle(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.filterChanged.emit({ sortOrder: this.sortOrder });
  }
}
