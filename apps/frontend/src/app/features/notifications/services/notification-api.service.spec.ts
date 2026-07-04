import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Notification, NotificationPreference } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { NotificationApiService } from './notification-api.service';

describe('NotificationApiService', () => {
  let service: NotificationApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/notifications`;

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
    payload: { taskId: 'task-1' },
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() requests the base notifications URL with query params', () => {
    service.list({ status: 'SENT', priority: 'HIGH' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === baseUrl);
    expect(req.request.params.get('status')).toBe('SENT');
    expect(req.request.params.get('priority')).toBe('HIGH');
    req.flush({ data: [mockNotification], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
  });

  it('unread() requests the unread sub-resource', () => {
    service.unread().subscribe((result) => expect(result).toEqual([mockNotification]));
    httpMock.expectOne(`${baseUrl}/unread`).flush([mockNotification]);
  });

  it('getPreferences() requests the preferences sub-resource', () => {
    service.getPreferences().subscribe((result) => expect(result).toEqual(mockPreference));
    const req = httpMock.expectOne(`${baseUrl}/preferences`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPreference);
  });

  it('updatePreferences() patches the preferences sub-resource', () => {
    service.updatePreferences({ enableEmail: true }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/preferences`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ enableEmail: true });
    req.flush({ ...mockPreference, enableEmail: true });
  });

  it('markRead() posts to the read sub-resource', () => {
    service.markRead(mockNotification.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/read/${mockNotification.id}`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockNotification, status: 'READ' });
  });

  it('markAllRead() posts to the read-all sub-resource', () => {
    service.markAllRead().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/read-all`);
    expect(req.request.method).toBe('POST');
    req.flush({ updatedCount: 3 });
  });

  it('dismiss() posts to the dismiss sub-resource', () => {
    service.dismiss(mockNotification.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/dismiss/${mockNotification.id}`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockNotification, status: 'DISMISSED' });
  });

  it('remove() deletes the specific notification', () => {
    service.remove(mockNotification.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockNotification.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
