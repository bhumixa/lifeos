import type { PaginatedResult } from './task.types.js';

export type CalendarProvider = 'LOCAL' | 'GOOGLE' | 'MICROSOFT' | 'APPLE' | 'ICAL';
export type CalendarSource = 'LOCAL' | 'SYNCED';
export type CalendarStatus = 'ACTIVE' | 'DISABLED';

export interface Calendar {
  id: string;
  name: string;
  provider: CalendarProvider;
  color: string;
  timezone: string;
  enabled: boolean;
  eventCount: number;
  /** lastSync of the most recent CalendarSync attempt, if any. */
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarRequest {
  name: string;
  provider?: CalendarProvider;
  color: string;
  timezone?: string;
  enabled?: boolean;
}

export type UpdateCalendarRequest = Partial<CreateCalendarRequest>;

export interface CalendarQueryParams {
  provider?: CalendarProvider;
  enabled?: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  /** Milestone 11: "Planner blocks may create calendar events." */
  plannerBlockId: string | null;
  /** Milestone 11: "Tasks may optionally create events." */
  taskId: string | null;
  /** Milestone 11: "Goals may create milestone events." */
  goalId: string | null;
  /** Milestone 11: "Journal entries remain read-only references." */
  journalEntryId: string | null;
  externalId: string | null;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string | null;
  source: CalendarSource;
  status: CalendarStatus;
  /** Computed on read, not stored — ids of other ACTIVE events in the same calendar whose time
   * range overlaps this one. */
  conflictsWith: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventRequest {
  calendarId: string;
  plannerBlockId?: string;
  taskId?: string;
  goalId?: string;
  journalEntryId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
}

export type UpdateCalendarEventRequest = Partial<CreateCalendarEventRequest> & {
  status?: CalendarStatus;
};

export interface CalendarEventQueryParams {
  calendarId?: string;
  /** ISO datetime lower bound on startTime — set to the visible range's start for Month/Week/Day views. */
  from?: string;
  /** ISO datetime upper bound on startTime — set to the visible range's end for Month/Week/Day views. */
  to?: string;
  status?: CalendarStatus;
  taskId?: string;
  goalId?: string;
  plannerBlockId?: string;
  journalEntryId?: string;
  page?: number;
  pageSize?: number;
}

export type PaginatedCalendarEvents = PaginatedResult<CalendarEvent>;

export interface CalendarSync {
  id: string;
  calendarId: string;
  lastSync: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  createdAt: string;
}

export interface SyncCalendarRequest {
  calendarId: string;
}
