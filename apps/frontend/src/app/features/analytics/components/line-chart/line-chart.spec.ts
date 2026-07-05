import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AnalyticsTimeSeriesPoint } from '@lifeos/shared-types';
import { LineChart } from './line-chart';

describe('LineChart', () => {
  let fixture: ComponentFixture<LineChart>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LineChart] });
    fixture = TestBed.createComponent(LineChart);
  });

  function seriesOf(points: { bucket: string; value: number }[]): AnalyticsTimeSeriesPoint[] {
    return points.map((point) => ({ bucket: point.bucket, value: point.value }));
  }

  it('shows an empty state message and no <svg> when the series is empty', () => {
    fixture.componentRef.setInput('series', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
    expect(fixture.nativeElement.querySelector('.line-chart__empty')).not.toBeNull();
  });

  it('plots one point per series entry', () => {
    fixture.componentRef.setInput(
      'series',
      seriesOf([
        { bucket: '2026-07-01', value: 1 },
        { bucket: '2026-07-02', value: 5 },
        { bucket: '2026-07-03', value: 3 },
      ]),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.line-chart__dot').length).toBe(3);
  });

  it('places the highest value nearest the top of the viewBox (lowest y)', () => {
    fixture.componentRef.setInput(
      'series',
      seriesOf([
        { bucket: '2026-07-01', value: 1 },
        { bucket: '2026-07-02', value: 10 },
      ]),
    );
    fixture.detectChanges();

    const dots = fixture.nativeElement.querySelectorAll('.line-chart__dot');
    const yLow = Number(dots[0].getAttribute('cy'));
    const yHigh = Number(dots[1].getAttribute('cy'));
    expect(yHigh).toBeLessThan(yLow);
  });

  it('renders a single point without dividing by zero', () => {
    fixture.componentRef.setInput('series', seriesOf([{ bucket: '2026-07-01', value: 5 }]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.line-chart__dot').length).toBe(1);
  });
});
