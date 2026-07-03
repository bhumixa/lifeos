import { TestBed } from '@angular/core/testing';
import type { Goal } from '@lifeos/shared-types';
import { of } from 'rxjs';
import { GoalApiService } from '../../goals/services/goal-api.service';
import { DashboardGoalsService } from './dashboard-goals.service';

describe('DashboardGoalsService', () => {
  let service: DashboardGoalsService;
  let goalApi: { list: jasmine.Spy };

  function makeGoal(overrides: Partial<Goal>): Goal {
    return {
      id: 'goal-1',
      title: 'Goal',
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
      status: 'ACTIVE',
      archived: false,
      milestones: [],
      milestonesCompletedCount: 0,
      milestonesTotalCount: 0,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    goalApi = { list: jasmine.createSpy('list') };
    TestBed.configureTestingModule({ providers: [{ provide: GoalApiService, useValue: goalApi }] });
    service = TestBed.inject(DashboardGoalsService);
  });

  it('requests goals excluding archived, with a bounded page size', () => {
    goalApi.list.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }));

    service.load().subscribe();

    expect(goalApi.list).toHaveBeenCalledWith({ archived: false, pageSize: 100 });
  });

  it('counts only ACTIVE goals as activeCount, and averages their progress', (done) => {
    const goals = [
      makeGoal({ id: 'g1', status: 'ACTIVE', progressPercent: 40 }),
      makeGoal({ id: 'g2', status: 'ACTIVE', progressPercent: 60 }),
      makeGoal({ id: 'g3', status: 'COMPLETED', progressPercent: 100 }),
    ];
    goalApi.list.and.returnValue(of({ data: goals, meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary.activeCount).toBe(2);
      expect(summary.averageProgressPercent).toBe(50);
      done();
    });
  });

  it('computes completionPercentage across all fetched (non-archived) goals', (done) => {
    const goals = [
      makeGoal({ id: 'g1', status: 'ACTIVE' }),
      makeGoal({ id: 'g2', status: 'COMPLETED' }),
      makeGoal({ id: 'g3', status: 'COMPLETED' }),
      makeGoal({ id: 'g4', status: 'CANCELLED' }),
    ];
    goalApi.list.and.returnValue(of({ data: goals, meta: { page: 1, pageSize: 100, total: 4, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary.completionPercentage).toBe(50);
      done();
    });
  });

  it('picks the nearest upcoming targetDate among ACTIVE goals', (done) => {
    const goals = [
      makeGoal({ id: 'g1', status: 'ACTIVE', title: 'Later', targetDate: '2026-12-01' }),
      makeGoal({ id: 'g2', status: 'ACTIVE', title: 'Sooner', targetDate: '2026-08-15' }),
      makeGoal({ id: 'g3', status: 'ACTIVE', title: 'No date', targetDate: null }),
    ];
    goalApi.list.and.returnValue(of({ data: goals, meta: { page: 1, pageSize: 100, total: 3, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary.nearestDeadline).toEqual({ goalId: 'g2', title: 'Sooner', targetDate: '2026-08-15' });
      done();
    });
  });

  it('returns a null nearestDeadline and zeroed stats when there are no goals', (done) => {
    goalApi.list.and.returnValue(of({ data: [], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } }));

    service.load().subscribe((summary) => {
      expect(summary).toEqual({
        activeCount: 0,
        averageProgressPercent: 0,
        completionPercentage: 0,
        nearestDeadline: null,
      });
      done();
    });
  });
});
