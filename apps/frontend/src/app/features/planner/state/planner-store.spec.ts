import { TestBed } from '@angular/core/testing';
import type { GeneratePlannerResult, PlannerBlock, PlannerDay } from '@lifeos/shared-types';
import { of, throwError } from 'rxjs';
import { PlannerApiService } from '../services/planner-api.service';
import { PlannerStore } from './planner-store';

describe('PlannerStore', () => {
  let store: PlannerStore;
  let plannerApi: {
    today: jasmine.Spy;
    getByDate: jasmine.Spy;
    createBlock: jasmine.Spy;
    updateBlock: jasmine.Spy;
    removeBlock: jasmine.Spy;
    reorder: jasmine.Spy;
    complete: jasmine.Spy;
    generate: jasmine.Spy;
  };

  const mockDay: PlannerDay = {
    id: 'day-1',
    date: '2026-07-03',
    notes: null,
    blocks: [],
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
  };

  beforeEach(() => {
    plannerApi = {
      today: jasmine.createSpy('today').and.returnValue(of(mockDay)),
      getByDate: jasmine.createSpy('getByDate').and.returnValue(of(mockDay)),
      createBlock: jasmine.createSpy('createBlock').and.returnValue(of(mockDay)),
      updateBlock: jasmine.createSpy('updateBlock').and.returnValue(of(mockDay)),
      removeBlock: jasmine.createSpy('removeBlock').and.returnValue(of(undefined)),
      reorder: jasmine.createSpy('reorder').and.returnValue(of(mockDay)),
      complete: jasmine.createSpy('complete').and.returnValue(of(mockDay)),
      generate: jasmine
        .createSpy('generate')
        .and.returnValue(of({ ...mockDay, unscheduledTaskIds: [], unscheduledHabitIds: [] } as GeneratePlannerResult)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: PlannerApiService, useValue: plannerApi }],
    });

    store = TestBed.inject(PlannerStore);
  });

  it('starts with no day loaded and not loading', () => {
    expect(store.day()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.blocks()).toEqual([]);
  });

  it('loadToday() populates the day on success', () => {
    store.loadToday();

    expect(plannerApi.today).toHaveBeenCalled();
    expect(store.day()).toEqual(mockDay);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('loadToday() sets an error message and clears loading on failure', () => {
    plannerApi.today.and.returnValue(throwError(() => new Error('network error')));

    store.loadToday();

    expect(store.loading()).toBe(false);
    expect(store.error()).toContain('Could not load');
  });

  it('loadDate() requests the specific date', () => {
    store.loadDate('2026-06-01');
    expect(plannerApi.getByDate).toHaveBeenCalledWith('2026-06-01');
  });

  it('isEmpty is true only once loaded with zero blocks and no error', () => {
    store.loadToday();
    expect(store.isEmpty()).toBe(true);
  });

  it('createBlock() sets the day directly from the response, without a separate reload', (done) => {
    const request = { type: 'FOCUS' as const, title: 'Deep work', startTime: 'a', endTime: 'b' };
    store.createBlock(request).subscribe(() => {
      expect(plannerApi.createBlock).toHaveBeenCalledWith(request);
      expect(store.day()).toEqual(mockDay);
      expect(plannerApi.getByDate).not.toHaveBeenCalled();
      done();
    });
  });

  it('updateBlock() sets the day directly from the response', (done) => {
    store.updateBlock('block-1', { title: 'Updated' }).subscribe(() => {
      expect(plannerApi.updateBlock).toHaveBeenCalledWith('block-1', { title: 'Updated' });
      expect(store.day()).toEqual(mockDay);
      done();
    });
  });

  it('removeBlock() refreshes the currently loaded date afterward', (done) => {
    store.loadToday();
    plannerApi.getByDate.calls.reset();

    store.removeBlock('block-1').subscribe(() => {
      expect(plannerApi.removeBlock).toHaveBeenCalledWith('block-1');
      expect(plannerApi.getByDate).toHaveBeenCalledWith('2026-07-03');
      done();
    });
  });

  it('reorder() sends the currently loaded date with the given block order', (done) => {
    store.loadToday();

    store.reorder(['b', 'a']).subscribe(() => {
      expect(plannerApi.reorder).toHaveBeenCalledWith({ date: '2026-07-03', blockIds: ['b', 'a'] });
      done();
    });
  });

  it('complete() delegates to the API and sets the returned day', (done) => {
    store.complete({ blockId: 'block-1' }).subscribe(() => {
      expect(plannerApi.complete).toHaveBeenCalledWith({ blockId: 'block-1' });
      expect(store.day()).toEqual(mockDay);
      done();
    });
  });

  it('generate() delegates to the API and sets the returned day', (done) => {
    store.generate({ date: '2026-07-03' }).subscribe((result) => {
      expect(plannerApi.generate).toHaveBeenCalledWith({ date: '2026-07-03' });
      expect(result.unscheduledTaskIds).toEqual([]);
      expect(store.day()?.id).toBe(mockDay.id);
      done();
    });
  });

  it("applyOptimisticOrder() replaces the current day's blocks locally without an API call", () => {
    store.loadToday();
    const reordered: PlannerBlock[] = [
      {
        id: 'block-1',
        plannerDayId: mockDay.id,
        type: 'CUSTOM',
        referenceId: null,
        title: 'Reordered',
        description: null,
        startTime: '2026-07-03T09:00:00.000Z',
        endTime: '2026-07-03T09:30:00.000Z',
        duration: 30,
        color: null,
        completed: false,
        order: 0,
        goalId: null,
        createdAt: '2026-07-03T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
      },
    ];

    store.applyOptimisticOrder(reordered);

    expect(store.blocks()).toEqual(reordered);
  });
});
