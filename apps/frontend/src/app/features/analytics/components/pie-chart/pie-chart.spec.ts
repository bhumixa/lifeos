import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PieChart, type PieSlice } from './pie-chart';

describe('PieChart', () => {
  let fixture: ComponentFixture<PieChart>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PieChart] });
    fixture = TestBed.createComponent(PieChart);
  });

  it('computes each slice’s percentage of the total', () => {
    const slices: PieSlice[] = [
      { label: 'A', value: 25, color: '#111' },
      { label: 'B', value: 75, color: '#222' },
    ];
    fixture.componentRef.setInput('slices', slices);
    fixture.detectChanges();

    const legendItems: HTMLElement[] = fixture.nativeElement.querySelectorAll('.pie-chart__legend-item');
    expect(legendItems[0].textContent).toContain('25%');
    expect(legendItems[1].textContent).toContain('75%');
  });

  it('renders a neutral donut and 0% legend entries when every value is 0', () => {
    const slices: PieSlice[] = [{ label: 'A', value: 0, color: '#111' }];
    fixture.componentRef.setInput('slices', slices);
    fixture.detectChanges();

    const legendItems: HTMLElement[] = fixture.nativeElement.querySelectorAll('.pie-chart__legend-item');
    expect(legendItems[0].textContent).toContain('0%');
  });
});
