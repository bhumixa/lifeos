import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricCard } from './metric-card';

describe('MetricCard', () => {
  let fixture: ComponentFixture<MetricCard>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MetricCard] });
    fixture = TestBed.createComponent(MetricCard);
    fixture.componentRef.setInput('label', 'Productivity');
    fixture.componentRef.setInput('value', '72');
    fixture.componentRef.setInput('icon', 'trending_up');
  });

  it('renders no accent color class when no score is given', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.metric-card--neutral')).not.toBeNull();
  });

  it('renders a high accent for a score of 70+', () => {
    fixture.componentRef.setInput('score', 85);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.metric-card--high')).not.toBeNull();
  });

  it('renders a low accent for a score below 40', () => {
    fixture.componentRef.setInput('score', 10);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.metric-card--low')).not.toBeNull();
  });

  it('shows no delta indicator when deltaPercent is not provided', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.metric-card__delta')).toBeNull();
  });

  it('shows an upward delta indicator for a positive deltaPercent', () => {
    fixture.componentRef.setInput('deltaPercent', 12);
    fixture.detectChanges();
    const delta = fixture.nativeElement.querySelector('.metric-card__delta');
    expect(delta.textContent).toContain('+12%');
    expect(delta.classList).toContain('metric-card__delta--up');
  });
});
