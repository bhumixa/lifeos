import { TestBed } from '@angular/core/testing';
import type { Habit, PaginatedHabits } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { HabitApiService } from '../services/habit-api.service';
import { HabitsStore } from './habits-store';

describe('HabitsStore', () => {
  let store: HabitsStore;
  let habitApi: {
    list: jasmine.Spy;
    create: jasmine.Spy;
    update: jasmine.Spy;
    remove: jasmine.Spy;
    createLog: jasmine.Spy;
    updateLog: jasmine.Spy;
    removeLog: jasmine.Spy;
  };

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

  const mockResult: PaginatedHabits = {
    data: [mockHabit],
    meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  };

  beforeEach(() => {
    habitApi = {
      list: jasmine.createSpy('list').and.returnValue(of(mockResult)),
      create: jasmine.createSpy('create').and.returnValue(of(mockHabit)),
      update: jasmine.createSpy('update').and.returnValue(of(mockHabit)),
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
      createLog: jasmine
        .createSpy('createLog')
        .and.returnValue(of({ id: 'log-1', habitId: mockHabit.id, date: '2026-07-03', completedCount: 1, notes: null, createdAt: '' })),
      updateLog: jasmine
        .createSpy('updateLog')
        .and.returnValue(of({ id: 'log-1', habitId: mockHabit.id, date: '2026-07-03', completedCount: 4, notes: null, createdAt: '' })),
      removeLog: jasmine.createSpy('removeLog').and.returnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: HabitApiService, useValue: habitApi }],
    });

    store = TestBed.inject(HabitsStore);
  });

  it('starts empty, not loading, with default pagination', () => {
    expect(store.habits()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.meta()).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });

  it('load() populates habits and meta on success', () => {
    store.load();

    expect(store.loading()).toBe(false);
    expect(store.habits()).toEqual([mockHabit]);
    expect(store.meta()).toEqual(mockResult.meta);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message and clears loading on failure', () => {
    habitApi.list.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Could not load habits. Please try again.');
  });

  it('isEmpty is true only once loaded with zero results and no error', () => {
    habitApi.list.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));

    store.load();

    expect(store.isEmpty()).toBe(true);
  });

  it('setQuery() with a non-page change resets to page 1 and reloads', () => {
    store.setQuery({ page: 3 });
    habitApi.list.calls.reset();

    store.setQuery({ isActive: true });

    expect(habitApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ isActive: true, page: 1 }));
  });

  it('setQuery() with only a page change does not reset the page', () => {
    store.setQuery({ page: 3 });

    expect(habitApi.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 3 }));
  });

  it('resetFilters() restores the default query and reloads', () => {
    store.setQuery({ search: 'water', page: 2 });
    habitApi.list.calls.reset();

    store.resetFilters();

    expect(habitApi.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }),
    );
  });

  it('createHabit() delegates to the API and reloads the list on success', (done) => {
    store.createHabit({ name: 'Drink water', icon: 'local_drink', color: '#03A9F4' }).subscribe(() => {
      expect(habitApi.create).toHaveBeenCalledWith({ name: 'Drink water', icon: 'local_drink', color: '#03A9F4' });
      expect(habitApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('deleteHabit() delegates to the API and reloads the list on success', (done) => {
    store.deleteHabit(mockHabit.id).subscribe(() => {
      expect(habitApi.remove).toHaveBeenCalledWith(mockHabit.id);
      expect(habitApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('quickComplete() creates a fresh log when nothing is logged today yet', (done) => {
    const freshHabit: Habit = { ...mockHabit, completedToday: false, todayCount: 0 };

    store.quickComplete(freshHabit).subscribe(() => {
      expect(habitApi.createLog).toHaveBeenCalledWith(freshHabit.id, {});
      expect(habitApi.updateLog).not.toHaveBeenCalled();
      expect(habitApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('quickComplete() increments the existing log when already logged today', (done) => {
    store.quickComplete(mockHabit).subscribe(() => {
      expect(habitApi.updateLog).toHaveBeenCalledWith(mockHabit.id, { completedCount: mockHabit.todayCount + 1 });
      expect(habitApi.createLog).not.toHaveBeenCalled();
      done();
    });
  });

  it('undoToday() removes today’s log and reloads the list on success', (done) => {
    store.undoToday(mockHabit).subscribe(() => {
      expect(habitApi.removeLog).toHaveBeenCalledWith(mockHabit.id);
      expect(habitApi.list).toHaveBeenCalled();
      done();
    });
  });
});
