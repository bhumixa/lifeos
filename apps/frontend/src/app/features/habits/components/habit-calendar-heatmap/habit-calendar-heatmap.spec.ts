import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { HeatmapCell } from '../../utils/habit-display';
import { HabitCalendarHeatmap } from './habit-calendar-heatmap';

describe('HabitCalendarHeatmap', () => {
  let fixture: ComponentFixture<HabitCalendarHeatmap>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HabitCalendarHeatmap] });
    fixture = TestBed.createComponent(HabitCalendarHeatmap);
  });

  function cellsFor(dates: string[]): HeatmapCell[] {
    return dates.map((date) => ({ date, completedCount: 1, level: 1 }));
  }

  it('renders nothing when there are no cells', () => {
    fixture.componentRef.setInput('cells', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.habit-heatmap__week').length).toBe(0);
  });

  it('pads the first week so the first cell lands on its correct weekday column', () => {
    // 2026-06-29 is a Monday — a Monday-start week needs zero leading padding.
    fixture.componentRef.setInput('cells', cellsFor(['2026-06-29', '2026-06-30']));
    fixture.detectChanges();

    const firstWeekCells = fixture.nativeElement.querySelectorAll('.habit-heatmap__week')[0].children;
    expect(firstWeekCells[0].classList).not.toContain('habit-heatmap__cell--empty');
  });

  it('pads with an empty leading cell when the first day is not a Monday', () => {
    // 2026-06-30 is a Tuesday — one empty cell should precede it.
    fixture.componentRef.setInput('cells', cellsFor(['2026-06-30']));
    fixture.detectChanges();

    const firstWeekCells = fixture.nativeElement.querySelectorAll('.habit-heatmap__week')[0].children;
    expect(firstWeekCells[0].classList).toContain('habit-heatmap__cell--empty');
    expect(firstWeekCells[1].classList).not.toContain('habit-heatmap__cell--empty');
  });

  it('renders one column per 7-day chunk', () => {
    fixture.componentRef.setInput(
      'cells',
      cellsFor(['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06']),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.habit-heatmap__week').length).toBe(2);
  });
});
