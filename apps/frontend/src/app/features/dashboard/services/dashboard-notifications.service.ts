import { Injectable, inject } from '@angular/core';
import type { NotificationSummary } from '@lifeos/shared-types';
import { forkJoin, map, type Observable } from 'rxjs';
import { NotificationApiService } from '../../notifications/services/notification-api.service';

/** Derives the Dashboard's three Notification widgets (Unread Notifications, Upcoming Reminders,
 * and the real Recent Activity feed) from three existing endpoint calls — `GET
 * /notifications/unread`, and two `GET /notifications` list calls (recent-overall, and
 * queued/upcoming sorted by `scheduledFor`) — the same "derived via local composition, no new
 * dashboard-specific endpoint" shape DashboardGoalsService/DashboardCalendarService already
 * establish. `pageSize: 5` for both list calls is a documented display cap, not a real pagination
 * need, matching DashboardGoalsService's own `pageSize: 100` precedent for the same reason. */
@Injectable({ providedIn: 'root' })
export class DashboardNotificationsService {
  private readonly notificationApi = inject(NotificationApiService);

  load(): Observable<NotificationSummary> {
    return forkJoin({
      unread: this.notificationApi.unread(),
      recent: this.notificationApi.list({ sortBy: 'createdAt', sortOrder: 'desc', pageSize: 5 }),
      upcoming: this.notificationApi.list({
        status: 'QUEUED',
        sortBy: 'scheduledFor',
        sortOrder: 'asc',
        pageSize: 5,
      }),
    }).pipe(
      map(({ unread, recent, upcoming }) => ({
        unreadCount: unread.length,
        upcomingCount: upcoming.meta.total,
        recent: recent.data,
        upcoming: upcoming.data,
      })),
    );
  }
}
