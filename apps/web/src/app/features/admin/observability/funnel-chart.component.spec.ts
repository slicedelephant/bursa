import { TestBed } from '@angular/core/testing';
import { FunnelReport } from '../../../core/models';
import { FunnelChartComponent } from './funnel-chart.component';

const report: FunnelReport = {
  steps: [
    { key: 'gallery_view', label: 'Gallery view', count: 100, conversionPct: 100, dropOffPct: 0 },
    { key: 'campaign_view', label: 'Campaign view', count: 40, conversionPct: 40, dropOffPct: 60 },
  ],
  overallConversionPct: 40,
};

describe('FunnelChartComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FunnelChartComponent],
    }).compileComponents();
  });

  function render(r: FunnelReport, title = 'Donation funnel') {
    const fixture = TestBed.createComponent(FunnelChartComponent);
    fixture.componentRef.setInput('report', r);
    fixture.componentRef.setInput('title', title);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the title, steps and overall conversion', () => {
    const el = render(report);
    expect(el.textContent).toContain('Donation funnel');
    expect(el.textContent).toContain('Gallery view');
    expect(el.textContent).toContain('40% overall conversion');
    expect(el.textContent).toContain('−60% vs previous');
  });

  it('shows an empty hint when there are no steps', () => {
    const el = render({ steps: [], overallConversionPct: 0 });
    expect(el.textContent).toContain('No funnel data yet');
  });
});
