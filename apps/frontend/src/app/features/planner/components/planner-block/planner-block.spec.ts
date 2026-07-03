import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PlannerBlock } from '@lifeos/shared-types';
import { PlannerBlockComponent } from './planner-block';

function makeBlock(overrides: Partial<PlannerBlock>): PlannerBlock {
  return {
    id: 'block-1',
    plannerDayId: 'day-1',
    type: 'FOCUS',
    referenceId: null,
    title: 'Deep work',
    description: null,
    startTime: '2026-07-03T09:00:00.000Z',
    endTime: '2026-07-03T10:00:00.000Z',
    duration: 60,
    color: null,
    completed: false,
    order: 0,
    goalId: null,
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('PlannerBlockComponent', () => {
  let fixture: ComponentFixture<PlannerBlockComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PlannerBlockComponent] });
    fixture = TestBed.createComponent(PlannerBlockComponent);
    fixture.componentRef.setInput('block', makeBlock({}));
    fixture.componentRef.setInput('top', 0);
  });

  it('renders the block title and time range', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Deep work');
    expect(fixture.nativeElement.querySelector('.time').textContent).toContain('–');
  });

  it('emits edit when the block itself is clicked', () => {
    fixture.detectChanges();
    const editSpy = jasmine.createSpy('edit');
    fixture.componentInstance.edit.subscribe(editSpy);

    (fixture.nativeElement.querySelector('.block') as HTMLElement).click();

    expect(editSpy).toHaveBeenCalledWith(fixture.componentInstance.block());
  });

  it('emits toggleComplete without triggering edit when its own button is clicked', () => {
    fixture.detectChanges();
    const editSpy = jasmine.createSpy('edit');
    const toggleSpy = jasmine.createSpy('toggleComplete');
    fixture.componentInstance.edit.subscribe(editSpy);
    fixture.componentInstance.toggleComplete.subscribe(toggleSpy);

    (fixture.nativeElement.querySelector('[aria-label="Mark complete"]') as HTMLElement).click();

    expect(toggleSpy).toHaveBeenCalled();
    expect(editSpy).not.toHaveBeenCalled();
  });

  it('emits deleteBlock and duplicate from their own buttons', () => {
    fixture.detectChanges();
    const deleteSpy = jasmine.createSpy('deleteBlock');
    const duplicateSpy = jasmine.createSpy('duplicate');
    fixture.componentInstance.deleteBlock.subscribe(deleteSpy);
    fixture.componentInstance.duplicate.subscribe(duplicateSpy);

    (fixture.nativeElement.querySelector('[aria-label="Delete block"]') as HTMLElement).click();
    (fixture.nativeElement.querySelector('[aria-label="Duplicate block"]') as HTMLElement).click();

    expect(deleteSpy).toHaveBeenCalled();
    expect(duplicateSpy).toHaveBeenCalled();
  });

  it('resize emits the new duration, snapped to 5 minutes, with a minimum of 5', () => {
    fixture.detectChanges();
    const resizeSpy = jasmine.createSpy('resizeBlock');
    fixture.componentInstance.resizeBlock.subscribe(resizeSpy);
    fixture.componentRef.setInput('pixelsPerMinute', 1);

    fixture.componentInstance['onResizeStart']({
      clientY: 100,
      stopPropagation: jasmine.createSpy('stopPropagation'),
      preventDefault: jasmine.createSpy('preventDefault'),
    } as unknown as PointerEvent);
    // Dragging down 22px at 1px/min should snap to +20 minutes (nearest 5).
    fixture.componentInstance['onWindowPointerMove']({ clientY: 122 } as PointerEvent);
    fixture.componentInstance['onWindowPointerUp']();

    expect(resizeSpy).toHaveBeenCalledWith({ block: fixture.componentInstance.block(), durationMinutes: 80 });
  });

  it('does not emit resize when the pointer is released without ever starting a resize', () => {
    fixture.detectChanges();
    const resizeSpy = jasmine.createSpy('resizeBlock');
    fixture.componentInstance.resizeBlock.subscribe(resizeSpy);

    fixture.componentInstance['onWindowPointerUp']();

    expect(resizeSpy).not.toHaveBeenCalled();
  });
});
