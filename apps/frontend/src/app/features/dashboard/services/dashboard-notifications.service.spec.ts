import { TestBed } from '@angular/core/testing';
import type { Notification } from '@lifeos/shared-types';
import { of } from 'rxjs';
import { NotificationApiService } from '../../notifications/services/notification-api.service';
import { DashboardNotificationsService } from './dashboard-notifications.service';

describe('DashboardNotificationsService', () => {
  let service: DashboardNotificationsService;
  let notificationApi: { list: jasmine.Spy; unread: jasmine.Spy };

  function makeNotification(overrides: Partial<Notification>): Notification {
    return {
      id: 'notif-1',
      title: 'Task completed',
      message: 'You completed "Write report".',
      type: 'TASK',
      priority: 'LOW',
      status: 'SENT',
      scheduledFor: '2026-07-15T10:00:00.000Z',
      deliveredAt: '2026-07-15T10:00:00.000Z',
      readAt: null,
      payload: null,
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-15T10:00:00.000Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    notificationApi = {
      list: jasmine.createSpy('list'),
      unread: jasmine.createSpy('unread'),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: NotificationApiService, useValue: notificationApi }],
    });
    service = TestBed.inject(DashboardNotificationsService);
  });

  it('combines unread(), recent list(), and upcoming list() into one summary', (done) => {
    const recent = [makeNotification({ id: 'recent-1' })];
    const upcoming = [makeNotification({ id: 'upcoming-1', status: 'QUEUED' })];

    notificationApi.unread.and.returnValue(of([makeNotification({ id: 'unread-1' })]));
    notificationApi.list.and.callFake((query: { status?: string }) =>
      query.status === 'QUEUED'
        ? of({ data: upcoming, meta: { page: 1, pageSize: 5, total: 1, totalPages: 1 } })
        : of({ data: recent, meta: { page: 1, pageSize: 5, total: 1, totalPages: 1 } }),
    );

    service.load().subscribe((summary) => {
      expect(summary.unreadCount).toBe(1);
      expect(summary.upcomingCount).toBe(1);
      expect(summary.recent).toEqual(recent);
      expect(summary.upcoming).toEqual(upcoming);
      done();
    });
  });

  it('requests the upcoming list scoped to QUEUED, sorted by scheduledFor ascending', () => {
    notificationApi.unread.and.returnValue(of([]));
    notificationApi.list.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 5, total: 0, totalPages: 1 } }));

    service.load().subscribe();

    expect(notificationApi.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 'QUEUED', sortBy: 'scheduledFor', sortOrder: 'asc' }),
    );
  });
});
