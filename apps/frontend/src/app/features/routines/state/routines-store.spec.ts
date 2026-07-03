import { TestBed } from '@angular/core/testing';
import type { Routine } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { RoutineApiService } from '../services/routine-api.service';
import { RoutinesStore } from './routines-store';

describe('RoutinesStore', () => {
  let store: RoutinesStore;
  let routineApi: { list: jasmine.Spy; remove: jasmine.Spy; activate: jasmine.Spy; deactivate: jasmine.Spy; duplicate: jasmine.Spy };

  const mockRoutine: Routine = {
    id: 'routine-1',
    name: 'Morning Routine',
    icon: 'wb_sunny',
    color: '#FF9800',
    description: null,
    isActive: true,
    goalId: null,
    steps: [],
    totalDurationMinutes: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    routineApi = {
      list: jasmine.createSpy('list').and.returnValue(of([mockRoutine])),
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
      activate: jasmine.createSpy('activate').and.returnValue(of({ ...mockRoutine, isActive: true })),
      deactivate: jasmine.createSpy('deactivate').and.returnValue(of({ ...mockRoutine, isActive: false })),
      duplicate: jasmine.createSpy('duplicate').and.returnValue(of({ ...mockRoutine, id: 'routine-2' })),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: RoutineApiService, useValue: routineApi }],
    });

    store = TestBed.inject(RoutinesStore);
  });

  it('starts empty and not loading', () => {
    expect(store.routines()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('load() populates routines on success', () => {
    store.load();

    expect(store.routines()).toEqual([mockRoutine]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message on failure', () => {
    routineApi.list.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.error()).toBe('Could not load routines. Please try again.');
  });

  it('isEmpty is true only once loaded with zero results and no error', () => {
    routineApi.list.and.returnValue(of([]));

    store.load();

    expect(store.isEmpty()).toBe(true);
  });

  it('deleteRoutine() delegates to the API and reloads the list', (done) => {
    store.deleteRoutine(mockRoutine.id).subscribe(() => {
      expect(routineApi.remove).toHaveBeenCalledWith(mockRoutine.id);
      expect(routineApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('setActive(routine, true) calls activate', (done) => {
    store.setActive(mockRoutine, true).subscribe(() => {
      expect(routineApi.activate).toHaveBeenCalledWith(mockRoutine.id);
      expect(routineApi.deactivate).not.toHaveBeenCalled();
      done();
    });
  });

  it('setActive(routine, false) calls deactivate', (done) => {
    store.setActive(mockRoutine, false).subscribe(() => {
      expect(routineApi.deactivate).toHaveBeenCalledWith(mockRoutine.id);
      expect(routineApi.activate).not.toHaveBeenCalled();
      done();
    });
  });

  it('duplicateRoutine() delegates to the API and reloads the list', (done) => {
    store.duplicateRoutine(mockRoutine.id).subscribe(() => {
      expect(routineApi.duplicate).toHaveBeenCalledWith(mockRoutine.id);
      expect(routineApi.list).toHaveBeenCalled();
      done();
    });
  });
});
