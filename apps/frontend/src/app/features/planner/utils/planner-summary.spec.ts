import type { PlannerBlock } from '@lifeos/shared-types';
import { computePlannerSummary } from './planner-summary';

function makeBlock(overrides: Partial<PlannerBlock>): PlannerBlock {
  return {
    id: 'block-1',
    plannerDayId: 'day-1',
    type: 'CUSTOM',
    referenceId: null,
    title: 'Block',
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
    ...overrides,
  };
}

describe('computePlannerSummary', () => {
  const now = new Date('2026-07-03T10:00:00.000Z');

  it('picks the earliest not-completed block starting after now as nextBlock', () => {
    const later = makeBlock({ id: 'later', startTime: '2026-07-03T12:00:00.000Z', endTime: '2026-07-03T12:30:00.000Z' });
    const sooner = makeBlock({ id: 'sooner', startTime: '2026-07-03T11:00:00.000Z', endTime: '2026-07-03T11:30:00.000Z' });
    const past = makeBlock({ id: 'past', startTime: '2026-07-03T08:00:00.000Z', endTime: '2026-07-03T08:30:00.000Z' });

    const summary = computePlannerSummary([later, sooner, past], now);

    expect(summary.nextBlock?.id).toBe('sooner');
    expect(summary.upcomingBlocks.map((b) => b.id)).toEqual(['sooner', 'later']);
  });

  it('excludes completed blocks from nextBlock/upcoming even if they start later', () => {
    const completed = makeBlock({
      id: 'done',
      completed: true,
      startTime: '2026-07-03T11:00:00.000Z',
      endTime: '2026-07-03T11:30:00.000Z',
    });

    const summary = computePlannerSummary([completed], now);

    expect(summary.nextBlock).toBeNull();
    expect(summary.upcomingBlocks).toEqual([]);
  });

  it('sums remaining minutes only for not-completed blocks that end after now', () => {
    const inProgress = makeBlock({
      id: 'in-progress',
      startTime: '2026-07-03T09:45:00.000Z',
      endTime: '2026-07-03T10:15:00.000Z',
      duration: 30,
    });
    const alreadyEnded = makeBlock({
      id: 'ended',
      startTime: '2026-07-03T08:00:00.000Z',
      endTime: '2026-07-03T08:30:00.000Z',
      duration: 30,
    });
    const completedFuture = makeBlock({
      id: 'completed-future',
      completed: true,
      startTime: '2026-07-03T13:00:00.000Z',
      endTime: '2026-07-03T13:30:00.000Z',
      duration: 30,
    });

    const summary = computePlannerSummary([inProgress, alreadyEnded, completedFuture], now);

    expect(summary.remainingMinutes).toBe(30);
  });

  it('sums FOCUS-type block durations regardless of completion or timing', () => {
    const focus1 = makeBlock({ id: 'f1', type: 'FOCUS', duration: 25 });
    const focus2 = makeBlock({ id: 'f2', type: 'FOCUS', duration: 50, completed: true });
    const task = makeBlock({ id: 't1', type: 'TASK', duration: 30 });

    const summary = computePlannerSummary([focus1, focus2, task], now);

    expect(summary.focusMinutes).toBe(75);
  });

  it('counts completed blocks regardless of type or timing', () => {
    const done1 = makeBlock({ id: 'd1', completed: true });
    const done2 = makeBlock({ id: 'd2', completed: true });
    const notDone = makeBlock({ id: 'nd', completed: false });

    const summary = computePlannerSummary([done1, done2, notDone], now);

    expect(summary.completedCount).toBe(2);
  });

  it('returns zeroed values for an empty day', () => {
    const summary = computePlannerSummary([], now);
    expect(summary).toEqual({ nextBlock: null, remainingMinutes: 0, focusMinutes: 0, completedCount: 0, upcomingBlocks: [] });
  });
});
