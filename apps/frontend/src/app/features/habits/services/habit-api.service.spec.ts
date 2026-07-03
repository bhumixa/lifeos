import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Habit } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { HabitApiService } from './habit-api.service';

describe('HabitApiService', () => {
  let service: HabitApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/habits`;

  const mockHabit: Habit = {
    id: 'habit-1',
    name: 'Drink water',
    description: null,
    icon: 'local_drink',
    color: '#03A9F4',
    targetFrequency: 'DAILY',
    targetCount: 8,
    category: null,
    reminderTime: null,
    isActive: true,
    currentPeriodCount: 3,
    completionPercent: 38,
    todayCount: 3,
    completedToday: true,
    goalId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HabitApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() requests the base habits URL with query params', () => {
    service.list({ page: 1, pageSize: 20 }).subscribe();
    const req = httpMock.expectOne((request) => request.url === baseUrl);
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ data: [mockHabit], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
  });

  it('getById() requests the specific habit', () => {
    service.getById(mockHabit.id).subscribe((habit) => expect(habit).toEqual(mockHabit));
    httpMock.expectOne(`${baseUrl}/${mockHabit.id}`).flush(mockHabit);
  });

  it('create() posts to the base habits URL', () => {
    service.create({ name: 'Drink water', icon: 'local_drink', color: '#03A9F4' }).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush(mockHabit);
  });

  it('update() patches the specific habit', () => {
    service.update(mockHabit.id, { name: 'Drink more water' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockHabit.id}`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockHabit);
  });

  it('remove() deletes the specific habit', () => {
    service.remove(mockHabit.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockHabit.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('createLog() posts to the log sub-resource', () => {
    service.createLog(mockHabit.id, { completedCount: 1 }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockHabit.id}/log`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'log-1', habitId: mockHabit.id, date: '2026-07-03', completedCount: 1, notes: null, createdAt: '2026-07-03T00:00:00.000Z' });
  });

  it('updateLog() patches the log sub-resource', () => {
    service.updateLog(mockHabit.id, { completedCount: 2 }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockHabit.id}/log`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 'log-1', habitId: mockHabit.id, date: '2026-07-03', completedCount: 2, notes: null, createdAt: '2026-07-03T00:00:00.000Z' });
  });

  it('removeLog() deletes the log sub-resource without a date param when omitted', () => {
    service.removeLog(mockHabit.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockHabit.id}/log`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.has('date')).toBe(false);
    req.flush(null);
  });

  it('removeLog() passes date as a query param when given', () => {
    service.removeLog(mockHabit.id, '2026-07-01').subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/${mockHabit.id}/log`);
    expect(req.request.params.get('date')).toBe('2026-07-01');
    req.flush(null);
  });

  it('today() requests the today sub-resource', () => {
    service.today().subscribe((habits) => expect(habits).toEqual([mockHabit]));
    httpMock.expectOne(`${baseUrl}/today`).flush([mockHabit]);
  });

  it('summary() requests the summary sub-resource', () => {
    let result: unknown;
    service.summary().subscribe((summary) => (result = summary));

    const summary = { habitsCompletedToday: 1, totalActiveHabits: 2, completionPercentage: 50 };
    httpMock.expectOne(`${baseUrl}/summary`).flush(summary);

    expect(result).toEqual(summary);
  });

  it('history() requests the history sub-resource with query params', () => {
    service.history({ habitId: mockHabit.id, dateFrom: '2026-06-01' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === `${baseUrl}/history`);
    expect(req.request.params.get('habitId')).toBe(mockHabit.id);
    expect(req.request.params.get('dateFrom')).toBe('2026-06-01');
    req.flush({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
  });
});
