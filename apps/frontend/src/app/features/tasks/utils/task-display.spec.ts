import type { Task } from '@lifeos/shared-types';
import { dueDateIndicator } from './task-display';

function taskWith(overrides: Partial<Pick<Task, 'dueDate' | 'status'>>): Pick<Task, 'dueDate' | 'status'> {
  return { dueDate: null, status: 'TODO', ...overrides };
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

describe('dueDateIndicator', () => {
  it('returns null when there is no due date', () => {
    expect(dueDateIndicator(taskWith({ dueDate: null }))).toBeNull();
  });

  it('returns null for a completed task, even if overdue', () => {
    expect(dueDateIndicator(taskWith({ dueDate: daysFromNow(-3), status: 'COMPLETED' }))).toBeNull();
  });

  it('returns null for a cancelled task', () => {
    expect(dueDateIndicator(taskWith({ dueDate: daysFromNow(1), status: 'CANCELLED' }))).toBeNull();
  });

  it('flags a past due date as overdue', () => {
    expect(dueDateIndicator(taskWith({ dueDate: daysFromNow(-1) }))).toEqual({ label: 'Overdue', variant: 'danger' });
  });

  it('flags a due date of today as due today', () => {
    expect(dueDateIndicator(taskWith({ dueDate: daysFromNow(0) }))).toEqual({ label: 'Due today', variant: 'warning' });
  });

  it('flags a due date of tomorrow as due tomorrow', () => {
    expect(dueDateIndicator(taskWith({ dueDate: daysFromNow(1) }))).toEqual({ label: 'Due tomorrow', variant: 'info' });
  });

  it('shows a formatted date for anything further out', () => {
    const result = dueDateIndicator(taskWith({ dueDate: daysFromNow(10) }));
    expect(result?.variant).toBe('neutral');
    expect(typeof result?.label).toBe('string');
  });
});
