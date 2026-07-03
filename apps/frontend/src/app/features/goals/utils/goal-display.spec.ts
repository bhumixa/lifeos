import type { Goal } from '@lifeos/shared-types';
import { deadlineIndicator, isManualTarget, progressLabel } from './goal-display';

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    title: 'Run a half marathon',
    description: null,
    icon: 'flag',
    color: '#3F51B5',
    category: null,
    priority: 'MEDIUM',
    targetType: 'TASK_COUNT',
    targetValue: 10,
    currentValue: 4,
    progressPercent: 40,
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

describe('isManualTarget', () => {
  it('is true only for CUSTOM', () => {
    expect(isManualTarget('CUSTOM')).toBe(true);
    expect(isManualTarget('TASK_COUNT')).toBe(false);
    expect(isManualTarget('HABIT_COMPLETION')).toBe(false);
    expect(isManualTarget('ROUTINE_COMPLETION')).toBe(false);
    expect(isManualTarget('FOCUS_TIME')).toBe(false);
  });
});

describe('deadlineIndicator', () => {
  const today = new Date();
  const isoDaysFromNow = (days: number): string => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };

  it('returns null when there is no targetDate', () => {
    expect(deadlineIndicator(makeGoal({ targetDate: null }))).toBeNull();
  });

  it('returns null for a completed goal, even with a past targetDate', () => {
    expect(deadlineIndicator(makeGoal({ targetDate: isoDaysFromNow(-5), status: 'COMPLETED' }))).toBeNull();
  });

  it('returns null for a cancelled goal', () => {
    expect(deadlineIndicator(makeGoal({ targetDate: isoDaysFromNow(3), status: 'CANCELLED' }))).toBeNull();
  });

  it('flags an overdue goal', () => {
    const result = deadlineIndicator(makeGoal({ targetDate: isoDaysFromNow(-2), status: 'ACTIVE' }));
    expect(result).toEqual({ label: 'Overdue', variant: 'danger' });
  });

  it('flags a goal due today', () => {
    const result = deadlineIndicator(makeGoal({ targetDate: isoDaysFromNow(0), status: 'ACTIVE' }));
    expect(result).toEqual({ label: 'Due today', variant: 'warning' });
  });

  it('flags a goal due within the next week as a warning', () => {
    const result = deadlineIndicator(makeGoal({ targetDate: isoDaysFromNow(5), status: 'ACTIVE' }));
    expect(result).toEqual({ label: 'Due in 5d', variant: 'warning' });
  });

  it('shows a plain date for anything further out', () => {
    const result = deadlineIndicator(makeGoal({ targetDate: isoDaysFromNow(30), status: 'ACTIVE' }));
    expect(result?.variant).toBe('neutral');
  });
});

describe('progressLabel', () => {
  it('formats currentValue / targetValue with the target type\'s unit', () => {
    expect(progressLabel(makeGoal({ currentValue: 4, targetValue: 10, targetType: 'TASK_COUNT' }))).toBe(
      '4 / 10 tasks completed',
    );
  });

  it('uses the FOCUS_TIME unit', () => {
    expect(progressLabel(makeGoal({ currentValue: 120, targetValue: 600, targetType: 'FOCUS_TIME' }))).toBe(
      '120 / 600 focus minutes',
    );
  });
});
