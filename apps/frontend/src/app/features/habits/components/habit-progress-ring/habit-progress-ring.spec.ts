import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HabitProgressRing } from './habit-progress-ring';

describe('HabitProgressRing', () => {
  let fixture: ComponentFixture<HabitProgressRing>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HabitProgressRing] });
    fixture = TestBed.createComponent(HabitProgressRing);
  });

  function setPercent(percent: number): { dashArray: number; dashOffset: number } {
    fixture.componentRef.setInput('percent', percent);
    fixture.detectChanges();

    const valueCircle = fixture.nativeElement.querySelector('.habit-progress-ring__value') as SVGCircleElement;
    return {
      dashArray: Number(valueCircle.getAttribute('stroke-dasharray')),
      dashOffset: Number(valueCircle.getAttribute('stroke-dashoffset')),
    };
  }

  it('renders the percent value as text', () => {
    fixture.componentRef.setInput('percent', 38);
    fixture.detectChanges();

    const text = fixture.nativeElement.querySelector('text') as SVGTextElement;
    expect(text.textContent?.trim()).toBe('38%');
  });

  it('offsets the value circle by the full circumference at 0%', () => {
    const { dashArray, dashOffset } = setPercent(0);
    expect(dashOffset).toBeCloseTo(dashArray, 5);
  });

  it('offsets the value circle by nothing at 100%', () => {
    const { dashOffset } = setPercent(100);
    expect(dashOffset).toBeCloseTo(0, 5);
  });

  it('clamps values above 100 to a full ring (zero offset)', () => {
    const { dashOffset } = setPercent(150);
    expect(dashOffset).toBeCloseTo(0, 5);
  });

  it('clamps negative values to an empty ring (full offset)', () => {
    const { dashArray, dashOffset } = setPercent(-20);
    expect(dashOffset).toBeCloseTo(dashArray, 5);
  });
});
