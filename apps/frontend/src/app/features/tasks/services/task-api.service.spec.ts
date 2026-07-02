import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PaginatedResult, Task } from '@lifeos/shared-types';
import { environment } from '../../../../environments/environment';
import { TaskApiService } from './task-api.service';

describe('TaskApiService', () => {
  let service: TaskApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/tasks`;

  const mockTask: Task = {
    id: 'task-1',
    title: 'Write report',
    description: null,
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: null,
    estimatedMinutes: null,
    completedAt: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() sends only the provided query params (omitting undefined/empty ones)', () => {
    const mockResult: PaginatedResult<Task> = { data: [mockTask], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };

    service.list({ search: 'report', status: undefined, page: 1, pageSize: 20 }).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === baseUrl && request.params.get('search') === 'report',
    );
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(mockResult);
  });

  it('getById() requests the specific task', () => {
    service.getById(mockTask.id).subscribe((task) => expect(task).toEqual(mockTask));
    httpMock.expectOne(`${baseUrl}/${mockTask.id}`).flush(mockTask);
  });

  it('create() posts to the base tasks URL', () => {
    service.create({ title: 'Write report' }).subscribe((task) => expect(task).toEqual(mockTask));
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    req.flush(mockTask);
  });

  it('update() patches the specific task', () => {
    service.update(mockTask.id, { title: 'Updated' }).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockTask.id}`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockTask, title: 'Updated' });
  });

  it('remove() deletes the specific task', () => {
    service.remove(mockTask.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockTask.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('complete() patches the complete sub-resource', () => {
    service.complete(mockTask.id).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/${mockTask.id}/complete`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockTask, status: 'COMPLETED' });
  });
});
