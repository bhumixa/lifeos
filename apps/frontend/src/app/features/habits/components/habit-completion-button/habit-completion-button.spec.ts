import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HabitCompletionButton } from './habit-completion-button';

describe('HabitCompletionButton', () => {
  let fixture: ComponentFixture<HabitCompletionButton>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HabitCompletionButton] });
    fixture = TestBed.createComponent(HabitCompletionButton);
  });

  it('shows a "Complete" call to action when not completed today', () => {
    fixture.componentRef.setInput('completedToday', false);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Complete');
  });

  it('emits complete when tapped while not completed today', () => {
    fixture.componentRef.setInput('completedToday', false);
    fixture.detectChanges();

    const completeSpy = jasmine.createSpy('complete');
    fixture.componentInstance.complete.subscribe(completeSpy);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(completeSpy).toHaveBeenCalled();
  });

  it('shows the today/target count once completed today', () => {
    fixture.componentRef.setInput('completedToday', true);
    fixture.componentRef.setInput('todayCount', 3);
    fixture.componentRef.setInput('targetCount', 8);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('3/8');
  });

  it('emits undo when tapped while completed today', () => {
    fixture.componentRef.setInput('completedToday', true);
    fixture.detectChanges();

    const undoSpy = jasmine.createSpy('undo');
    fixture.componentInstance.undo.subscribe(undoSpy);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(undoSpy).toHaveBeenCalled();
  });
});
