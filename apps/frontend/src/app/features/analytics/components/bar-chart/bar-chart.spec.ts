import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AnalyticsTimeSeriesPoint } from '@lifeos/shared-types';
import { BarChart } from './bar-chart';

describe('BarChart', () => {
  let fixture: ComponentFixture<BarChart>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BarChart] });
    fixture = TestBed.createComponent(BarChart);
  });

  it('shows an empty state when the series is empty', () => {
    fixture.componentRef.setInput('series', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.bar-chart__empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.bar-chart__column').length).toBe(0);
  });

  it('renders one column per series entry', () => {
    const series: AnalyticsTimeSeriesPoint[] = [
      { bucket: '2026-07-01', value: 2 },
      { bucket: '2026-07-02', value: 8 },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.bar-chart__column').length).toBe(2);
  });

  it('scales the tallest bar to 100% height', () => {
    const series: AnalyticsTimeSeriesPoint[] = [
      { bucket: '2026-07-01', value: 2 },
      { bucket: '2026-07-02', value: 8 },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    const bars: HTMLElement[] = fixture.nativeElement.querySelectorAll('.bar-chart__bar');
    expect(bars[1].style.height).toBe('100%');
    expect(bars[0].style.height).toBe('25%');
  });

  it('gives a zero-value bar a visible minimum height rather than disappearing', () => {
    const series: AnalyticsTimeSeriesPoint[] = [
      { bucket: '2026-07-01', value: 0 },
      { bucket: '2026-07-02', value: 4 },
    ];
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    const bars: HTMLElement[] = fixture.nativeElement.querySelectorAll('.bar-chart__bar');
    expect(Number.parseFloat(bars[0].style.height)).toBeGreaterThan(0);
  });
});
