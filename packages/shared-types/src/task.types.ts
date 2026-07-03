export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  estimatedMinutes: number | null;
  completedAt: string | null;
  tags: string[];
  /** Milestone 9: optional Goal this task contributes to. */
  goalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  estimatedMinutes?: number;
  tags?: string[];
  /** Milestone 9: optional Goal this task contributes to (must belong to the same user). */
  goalId?: string;
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>;

export type TaskSortBy = 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface TaskQueryParams {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tag?: string;
  sortBy?: TaskSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
  /** ISO datetime bounds on dueDate — used for both the "Filter" UI and dashboard queries
   * (e.g. "due today", "upcoming") without needing dedicated endpoints for each. */
  dueFrom?: string;
  dueTo?: string;
  /** ISO datetime bounds on completedAt — powers the dashboard's "Completed Today" count. */
  completedFrom?: string;
  completedTo?: string;
}
