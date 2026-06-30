import { TestBed } from '@angular/core/testing';
import { TrendReport } from '../../core/models';
import { TrendChartComponent } from './trend-chart.component';

const report = (over: Partial<TrendReport> = {}): TrendReport => ({
  years: [
    { year: 2025, investedEur: 80000, scholarCount: 30, femaleSharePct: 33.3 },
    { year: 2026, investedEur: 125000, scholarCount: 57, femaleSharePct: 35.1 },
  ],
  deltas: [
    { year: 2026, investedEurDelta: 45000, scholarCountDelta: 27, femaleShareDeltaPct: 1.8 },
  ],
  ...over,
});

describe('TrendChartComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendChartComponent],
    }).compileComponents();
  });

  function render(r: TrendReport) {
    const fixture = TestBed.createComponent(TrendChartComponent);
    fixture.componentRef.setInput('report', r);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a row per year with the YoY delta', () => {
    const el = render(report()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('2025');
    expect(el.textContent).toContain('2026');
    expect(el.textContent).toContain('▲');
    expect(el.textContent).toContain('+45,000');
  });

  it('shows an empty hint when there are no years', () => {
    const el = render(report({ years: [], deltas: [] })).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No trend data yet');
  });
});
