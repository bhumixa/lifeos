import { TestBed } from '@angular/core/testing';
import type { Notification, NotificationPreference } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { NotificationApiService } from '../services/notification-api.service';
import { NotificationsStore } from './notifications-store';

describe('NotificationsStore', () => {
  let store: NotificationsStore;
  let api: {
    list: jasmine.Spy;
    unread: jasmine.Spy;
    getPreferences: jasmine.Spy;
    updatePreferences: jasmine.Spy;
    markRead: jasmine.Spy;
    markAllRead: jasmine.Spy;
    dismiss: jasmine.Spy;
    remove: jasmine.Spy;
  };

  const mockNotification: Notification = {
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
  };

  const mockPreference: NotificationPreference = {
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'UTC',
    enableTasks: true,
    enableHabits: true,
    enablePlanner: true,
    enableGoals: true,
    enableJournal: true,
    enableCalendar: true,
    enableStreaks: true,
    enableAchievements: true,
    enableEmail: false,
    enablePush: false,
    enableInApp: true,
  };

  const mockPage = { data: [mockNotification], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };

  beforeEach(() => {
    api = {
      list: jasmine.createSpy('list').and.returnValue(of(mockPage)),
      unread: jasmine.createSpy('unread').and.returnValue(of([mockNotification])),
      getPreferences: jasmine.createSpy('getPreferences').and.returnValue(of(mockPreference)),
      updatePreferences: jasmine
        .createSpy('updatePreferences')
        .and.returnValue(of({ ...mockPreference, enableEmail: true })),
      markRead: jasmine.createSpy('markRead').and.returnValue(of({ ...mockNotification, status: 'READ' })),
      markAllRead: jasmine.createSpy('markAllRead').and.returnValue(of({ updatedCount: 1 })),
      dismiss: jasmine.createSpy('dismiss').and.returnValue(of({ ...mockNotification, status: 'DISMISSED' })),
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: NotificationApiService, useValue: api }],
    });

    store = TestBed.inject(NotificationsStore);
  });

  it('starts empty and not loading', () => {
    expect(store.notifications()).toEqual([]);
    expect(store.unread()).toEqual([]);
    expect(store.unreadCount()).toBe(0);
    expect(store.loading()).toBe(false);
  });

  it('load() populates notifications and meta on success', () => {
    store.load();

    expect(store.notifications()).toEqual([mockNotification]);
    expect(store.meta()).toEqual(mockPage.meta);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message on failure', () => {
    api.list.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.error()).toBe('Could not load notifications. Please try again.');
  });

  it('loadUnread() populates unread and derives unreadCount', () => {
    store.loadUnread();

    expect(store.unread()).toEqual([mockNotification]);
    expect(store.unreadCount()).toBe(1);
  });

  it('loadPreferences() populates the preference signal', () => {
    store.loadPreferences();

    expect(store.preference()).toEqual(mockPreference);
  });

  it('updatePreferences() persists the patch and updates the local signal', () => {
    store.updatePreferences({ enableEmail: true }).subscribe();

    expect(api.updatePreferences).toHaveBeenCalledWith({ enableEmail: true });
    expect(store.preference()?.enableEmail).toBe(true);
  });

  it('setQuery() resets to page 1 for a non-page change and reloads', () => {
    store.setQuery({ page: 3 });
    api.list.calls.reset();

    store.setQuery({ status: 'READ' });

    expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'READ', page: 1 }));
  });

  it('setQuery() preserves the page for an explicit page-only change', () => {
    store.setQuery({ page: 3 });

    expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 3 }));
  });

  it('markRead()/markAllRead()/dismiss()/remove() each refresh both the list and unread count', () => {
    store.markRead(mockNotification.id).subscribe();
    expect(api.list).toHaveBeenCalled();
    expect(api.unread).toHaveBeenCalled();

    api.list.calls.reset();
    api.unread.calls.reset();
    store.markAllRead().subscribe();
    expect(api.list).toHaveBeenCalled();
    expect(api.unread).toHaveBeenCalled();

    api.list.calls.reset();
    api.unread.calls.reset();
    store.dismiss(mockNotification.id).subscribe();
    expect(api.list).toHaveBeenCalled();
    expect(api.unread).toHaveBeenCalled();

    api.list.calls.reset();
    api.unread.calls.reset();
    store.remove(mockNotification.id).subscribe();
    expect(api.list).toHaveBeenCalled();
    expect(api.unread).toHaveBeenCalled();
  });
});
