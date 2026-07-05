import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Heatmap, type HeatmapCell } from './heatmap';

describe('Heatmap', () => {
  let fixture: ComponentFixture<Heatmap>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Heatmap] });
    fixture = TestBed.createComponent(Heatmap);
  });

  it('shows an empty state when there are no cells', () => {
    fixture.componentRef.setInput('cells', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.heatmap__empty')).not.toBeNull();
  });

  it('pads with an empty leading cell when the first day is not a Monday', () => {
    // 2026-06-30 is a Tuesday — one empty cell should precede it.
    const cells: HeatmapCell[] = [{ date: '2026-06-30', value: 1 }];
    fixture.componentRef.setInput('cells', cells);
    fixture.detectChanges();

    const firstColumnCells = fixture.nativeElement.querySelectorAll('.heatmap__column')[0].children;
    expect(firstColumnCells[0].classList).toContain('heatmap__cell--empty');
    expect(firstColumnCells[1].classList).not.toContain('heatmap__cell--empty');
  });

  it('gives a zero-value day the lowest opacity, not the highest-value day’s opacity', () => {
    const cells: HeatmapCell[] = [
      { date: '2026-06-29', value: 0 },
      { date: '2026-06-30', value: 10 },
    ];
    fixture.componentRef.setInput('cells', cells);
    fixture.detectChanges();

    const rendered: HTMLElement[] = fixture.nativeElement.querySelectorAll('.heatmap__cell:not(.heatmap__cell--empty)');
    const zeroOpacity = Number(rendered[0].style.opacity);
    const maxOpacity = Number(rendered[1].style.opacity);
    expect(zeroOpacity).toBeLessThan(maxOpacity);
  });
});
