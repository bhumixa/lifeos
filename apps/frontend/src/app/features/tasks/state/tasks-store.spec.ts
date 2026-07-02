import { TestBed } from '@angular/core/testing';
import type { PaginatedResult, Task } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { TaskApiService } from '../services/task-api.service';
import { TasksStore } from './tasks-store';

describe('TasksStore', () => {
  let store: TasksStore;
  let taskApi: {
    list: jasmine.Spy;
    create: jasmine.Spy;
    update: jasmine.Spy;
    remove: jasmine.Spy;
    complete: jasmine.Spy;
  };

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

  const mockResult: PaginatedResult<Task> = {
    data: [mockTask],
    meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    taskApi = {
      list: jasmine.createSpy('list').and.returnValue(of(mockResult)),
      create: jasmine.createSpy('create').and.returnValue(of(mockTask)),
      update: jasmine.createSpy('update').and.returnValue(of(mockTask)),
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
      complete: jasmine.createSpy('complete').and.returnValue(of(mockTask)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TaskApiService, useValue: taskApi }],
    });

    store = TestBed.inject(TasksStore);
  });

  it('starts empty, not loading, with default pagination', () => {
    expect(store.tasks()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.meta()).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });

  it('load() populates tasks and meta on success', () => {
    store.load();

    expect(store.loading()).toBe(false);
    expect(store.tasks()).toEqual([mockTask]);
    expect(store.meta()).toEqual(mockResult.meta);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message and clears loading on failure', () => {
    taskApi.list.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Could not load tasks. Please try again.');
  });

  it('isEmpty is true only once loaded with zero results and no error', () => {
    taskApi.list.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));

    store.load();

    expect(store.isEmpty()).toBe(true);
  });

  it('setQuery() with a non-page change resets to page 1 and reloads', () => {
    store.setQuery({ page: 3 });
    taskApi.list.calls.reset();

    store.setQuery({ status: 'COMPLETED' });

    expect(taskApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ status: 'COMPLETED', page: 1 }));
  });

  it('setQuery() with only a page change does not reset the page', () => {
    store.setQuery({ page: 3 });

    expect(taskApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 3 }));
  });

  it('resetFilters() restores the default query and reloads', () => {
    store.setQuery({ search: 'report', page: 2 });
    taskApi.list.calls.reset();

    store.resetFilters();

    expect(taskApi.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }),
    );
  });

  it('createTask() delegates to the API and reloads the list on success', (done) => {
    store.createTask({ title: 'New task' }).subscribe(() => {
      expect(taskApi.create).toHaveBeenCalledWith({ title: 'New task' });
      expect(taskApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('deleteTask() delegates to the API and reloads the list on success', (done) => {
    store.deleteTask(mockTask.id).subscribe(() => {
      expect(taskApi.remove).toHaveBeenCalledWith(mockTask.id);
      expect(taskApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('completeTask() delegates to the API and reloads the list on success', (done) => {
    store.completeTask(mockTask.id).subscribe(() => {
      expect(taskApi.complete).toHaveBeenCalledWith(mockTask.id);
      expect(taskApi.list).toHaveBeenCalled();
      done();
    });
  });
});
