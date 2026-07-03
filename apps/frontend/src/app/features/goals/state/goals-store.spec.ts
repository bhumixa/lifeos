import { TestBed } from '@angular/core/testing';
import type { Goal, GoalMilestone } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { GoalApiService } from '../services/goal-api.service';
import { GoalsStore } from './goals-store';

describe('GoalsStore', () => {
  let store: GoalsStore;
  let goalApi: {
    list: jasmine.Spy;
    create: jasmine.Spy;
    update: jasmine.Spy;
    remove: jasmine.Spy;
    archive: jasmine.Spy;
    unarchive: jasmine.Spy;
    addMilestone: jasmine.Spy;
    updateMilestone: jasmine.Spy;
    removeMilestone: jasmine.Spy;
  };

  const mockGoal: Goal = {
    id: 'goal-1',
    title: 'Run a half marathon',
    description: null,
    icon: 'flag',
    color: '#3F51B5',
    category: null,
    priority: 'MEDIUM',
    targetType: 'TASK_COUNT',
    targetValue: 10,
    currentValue: 0,
    progressPercent: 0,
    startDate: null,
    targetDate: null,
    status: 'NOT_STARTED',
    archived: false,
    milestones: [],
    milestonesCompletedCount: 0,
    milestonesTotalCount: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  const mockMilestone: GoalMilestone = {
    id: 'milestone-1',
    goalId: mockGoal.id,
    title: 'First checkpoint',
    description: null,
    dueDate: null,
    completed: false,
    completedAt: null,
    order: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  const mockPage = { data: [mockGoal], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };

  beforeEach(() => {
    goalApi = {
      list: jasmine.createSpy('list').and.returnValue(of(mockPage)),
      create: jasmine.createSpy('create').and.returnValue(of(mockGoal)),
      update: jasmine.createSpy('update').and.returnValue(of(mockGoal)),
      remove: jasmine.createSpy('remove').and.returnValue(of(undefined)),
      archive: jasmine.createSpy('archive').and.returnValue(of({ ...mockGoal, archived: true })),
      unarchive: jasmine.createSpy('unarchive').and.returnValue(of(mockGoal)),
      addMilestone: jasmine.createSpy('addMilestone').and.returnValue(of(mockMilestone)),
      updateMilestone: jasmine.createSpy('updateMilestone').and.returnValue(of({ ...mockMilestone, completed: true })),
      removeMilestone: jasmine.createSpy('removeMilestone').and.returnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: GoalApiService, useValue: goalApi }],
    });

    store = TestBed.inject(GoalsStore);
  });

  it('starts empty and not loading', () => {
    expect(store.goals()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('load() populates goals and meta on success', () => {
    store.load();

    expect(store.goals()).toEqual([mockGoal]);
    expect(store.meta()).toEqual(mockPage.meta);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('load() sets an error message on failure', () => {
    goalApi.list.and.returnValue(throwError(() => new Error('network error')));

    store.load();

    expect(store.error()).toBe('Could not load goals. Please try again.');
  });

  it('isEmpty is true only once loaded with zero results and no error', () => {
    goalApi.list.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }));

    store.load();

    expect(store.isEmpty()).toBe(true);
  });

  it('setQuery(patch) resets page to 1 for a non-page change', () => {
    store.setQuery({ page: 3 });
    goalApi.list.calls.reset();

    store.setQuery({ status: 'ACTIVE' });

    expect(store.query().page).toBe(1);
    expect(store.query().status).toBe('ACTIVE');
    expect(goalApi.list).toHaveBeenCalled();
  });

  it('setQuery({ page }) alone does not reset to page 1', () => {
    store.setQuery({ page: 3 });

    expect(store.query().page).toBe(3);
  });

  it('createGoal() delegates to the API and reloads the list', (done) => {
    store.createGoal({ title: 'Run a half marathon', icon: 'flag', color: '#3F51B5', targetType: 'TASK_COUNT', targetValue: 10 }).subscribe(
      () => {
        expect(goalApi.create).toHaveBeenCalled();
        expect(goalApi.list).toHaveBeenCalled();
        done();
      },
    );
  });

  it('deleteGoal() delegates to the API and reloads the list', (done) => {
    store.deleteGoal(mockGoal.id).subscribe(() => {
      expect(goalApi.remove).toHaveBeenCalledWith(mockGoal.id);
      expect(goalApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('archiveGoal() delegates to the API and reloads the list', (done) => {
    store.archiveGoal(mockGoal.id).subscribe((goal) => {
      expect(goalApi.archive).toHaveBeenCalledWith(mockGoal.id);
      expect(goal.archived).toBe(true);
      expect(goalApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('unarchiveGoal() delegates to the API and reloads the list', (done) => {
    store.unarchiveGoal(mockGoal.id).subscribe(() => {
      expect(goalApi.unarchive).toHaveBeenCalledWith(mockGoal.id);
      expect(goalApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('addMilestone() delegates to the API and reloads the list', (done) => {
    store.addMilestone(mockGoal.id, { title: 'First checkpoint' }).subscribe(() => {
      expect(goalApi.addMilestone).toHaveBeenCalledWith(mockGoal.id, { title: 'First checkpoint' });
      expect(goalApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('updateMilestone() delegates to the API and reloads the list', (done) => {
    store.updateMilestone(mockMilestone.id, { completed: true }).subscribe((milestone) => {
      expect(goalApi.updateMilestone).toHaveBeenCalledWith(mockMilestone.id, { completed: true });
      expect(milestone.completed).toBe(true);
      expect(goalApi.list).toHaveBeenCalled();
      done();
    });
  });

  it('removeMilestone() delegates to the API and reloads the list', (done) => {
    store.removeMilestone(mockMilestone.id).subscribe(() => {
      expect(goalApi.removeMilestone).toHaveBeenCalledWith(mockMilestone.id);
      expect(goalApi.list).toHaveBeenCalled();
      done();
    });
  });
});
