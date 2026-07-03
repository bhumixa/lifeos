import { TestBed } from '@angular/core/testing';
import type { Routine, RoutineStep } from '@lifeos/shared-types';
import { of } from 'rxjs';
import { RoutineApiService } from '../../routines/services/routine-api.service';
import { DashboardRoutineSummaryService } from './dashboard-routine-summary.service';

describe('DashboardRoutineSummaryService', () => {
  let service: DashboardRoutineSummaryService;
  let routineApi: { list: jasmine.Spy };

  function makeStep(overrides: Partial<RoutineStep>): RoutineStep {
    return {
      id: 'step-1',
      routineId: 'routine-1',
      title: 'Step',
      startTime: '07:00',
      durationMinutes: 10,
      order: 0,
      reminderMinutesBefore: null,
      isRequired: true,
      ...overrides,
    };
  }

  function makeRoutine(overrides: Partial<Routine>): Routine {
    return {
      id: 'routine-1',
      name: 'Morning Routine',
      icon: 'wb_sunny',
      color: '#FF9800',
      description: null,
      isActive: true,
      steps: [],
      totalDurationMinutes: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  beforeEach(() => {
    routineApi = { list: jasmine.createSpy('list') };
    TestBed.configureTestingModule({ providers: [{ provide: RoutineApiService, useValue: routineApi }] });
    service = TestBed.inject(DashboardRoutineSummaryService);

    jasmine.clock().install();
    // 08:00 local time "now" for every test below.
    const now = new Date();
    now.setHours(8, 0, 0, 0);
    jasmine.clock().mockDate(now);
  });

  afterEach(() => jasmine.clock().uninstall());

  it('returns an empty summary when there are no active routines with steps', (done) => {
    routineApi.list.and.returnValue(of([makeRoutine({ steps: [] })]));

    service.load().subscribe((summary) => {
      expect(summary).toEqual({ current: null, next: null, completionPercent: 0 });
      done();
    });
  });

  it('identifies the routine whose step window contains "now" as current', (done) => {
    const routine = makeRoutine({
      steps: [makeStep({ id: 's1', startTime: '07:00', durationMinutes: 30 }), makeStep({ id: 's2', startTime: '07:45', durationMinutes: 30 })],
    });
    routineApi.list.and.returnValue(of([routine]));

    service.load().subscribe((summary) => {
      expect(summary.current?.id).toBe(routine.id);
      expect(summary.next).toBeNull();
      done();
    });
  });

  it('computes completionPercent as the share of steps whose start time has already passed', (done) => {
    const routine = makeRoutine({
      steps: [
        makeStep({ id: 's1', startTime: '07:00', durationMinutes: 10 }), // passed
        makeStep({ id: 's2', startTime: '07:30', durationMinutes: 10 }), // passed
        makeStep({ id: 's3', startTime: '09:00', durationMinutes: 60 }), // not passed, but still within window end
      ],
    });
    routineApi.list.and.returnValue(of([routine]));

    service.load().subscribe((summary) => {
      // window is 07:00 -> 10:00, "now" (08:00) is inside it, so this routine is "current"
      expect(summary.current?.id).toBe(routine.id);
      expect(summary.completionPercent).toBe(67); // 2 of 3 steps started
      done();
    });
  });

  it('identifies the soonest not-yet-started routine as next', (done) => {
    const soon = makeRoutine({ id: 'routine-soon', steps: [makeStep({ startTime: '09:00', durationMinutes: 15 })] });
    const later = makeRoutine({ id: 'routine-later', steps: [makeStep({ startTime: '18:00', durationMinutes: 15 })] });
    routineApi.list.and.returnValue(of([later, soon]));

    service.load().subscribe((summary) => {
      expect(summary.current).toBeNull();
      expect(summary.next?.id).toBe('routine-soon');
      done();
    });
  });

  it('returns no next routine when nothing is left later today', (done) => {
    const past = makeRoutine({ steps: [makeStep({ startTime: '05:00', durationMinutes: 15 })] });
    routineApi.list.and.returnValue(of([past]));

    service.load().subscribe((summary) => {
      expect(summary.current).toBeNull();
      expect(summary.next).toBeNull();
      done();
    });
  });
});
