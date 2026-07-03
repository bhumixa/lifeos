import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PlannerBlock } from '@lifeos/shared-types';
import { ConflictWarning } from './conflict-warning';

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

describe('ConflictWarning', () => {
  let fixture: ComponentFixture<ConflictWarning>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ConflictWarning] });
    fixture = TestBed.createComponent(ConflictWarning);
  });

  it('renders nothing when there are no overlapping blocks', () => {
    fixture.componentRef.setInput('blocks', [makeBlock({ id: 'a' })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.warning')).toBeNull();
  });

  it('lists only the conflicting blocks, in chronological order', () => {
    const a = makeBlock({ id: 'a', title: 'A', startTime: '2026-07-03T09:00:00.000Z', endTime: '2026-07-03T10:00:00.000Z' });
    const b = makeBlock({ id: 'b', title: 'B', startTime: '2026-07-03T09:30:00.000Z', endTime: '2026-07-03T10:30:00.000Z' });
    const c = makeBlock({ id: 'c', title: 'C', startTime: '2026-07-03T11:00:00.000Z', endTime: '2026-07-03T12:00:00.000Z' });

    fixture.componentRef.setInput('blocks', [c, b, a]);
    fixture.detectChanges();

    const warning = fixture.nativeElement.querySelector('.warning');
    expect(warning).not.toBeNull();
    expect(warning.textContent).toContain('2 blocks have overlapping times');

    const items: HTMLLIElement[] = Array.from(fixture.nativeElement.querySelectorAll('li'));
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('A');
    expect(items[1].textContent).toContain('B');
    expect(fixture.nativeElement.textContent).not.toContain('C —');
  });
});
