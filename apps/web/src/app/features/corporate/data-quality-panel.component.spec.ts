import { TestBed } from '@angular/core/testing';
import { DataQualityReport } from '../../core/models';
import { DataQualityPanelComponent } from './data-quality-panel.component';

const report = (over: Partial<DataQualityReport> = {}): DataQualityReport => ({
  overallPct: 66.7,
  fields: [
    { field: 'gender', captured: 48, total: 57, pct: 84.2, collectMore: false },
    { field: 'birthYear', captured: 9, total: 57, pct: 15.8, collectMore: true },
  ],
  ...over,
});

describe('DataQualityPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataQualityPanelComponent],
    }).compileComponents();
  });

  function render(r: DataQualityReport) {
    const fixture = TestBed.createComponent(DataQualityPanelComponent);
    fixture.componentRef.setInput('report', r);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the overall score and per-field rows', () => {
    const el = render(report()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('66.7%');
    expect(el.textContent).toContain('Gender');
    expect(el.textContent).toContain('48/57');
    expect(el.textContent).toContain('Age');
  });

  it('shows a collect-more hint for flagged fields', () => {
    const el = render(report()).nativeElement as HTMLElement;
    expect(el.textContent).toContain('collect more age data');
  });

  it('omits the hint for complete fields', () => {
    const el = render(
      report({
        fields: [{ field: 'country', captured: 57, total: 57, pct: 100, collectMore: false }],
      }),
    ).nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('collect more');
  });
});
