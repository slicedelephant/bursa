import { TestBed } from '@angular/core/testing';
import { CsrdReportView } from '../../core/models';
import { ReportBuilderComponent } from './report-builder.component';

const view: CsrdReportView = {
  standard: 'GRI_2024',
  period: { start: '2026-01-01', end: '2026-12-31' },
  metrics: [
    {
      code: 'GRI 201-1',
      label: 'Economic value distributed',
      value: 125000,
      unit: 'EUR',
      note: 'n',
    },
    { code: 'GRI 405-1', label: 'Female share', value: 35.1, unit: '% female', note: 'n' },
  ],
  annotations: [
    {
      ref: 1,
      sequence: 7,
      entryType: 'PAYOUT',
      amountCents: 250000,
      reason: 'tuition',
      entryHash: 'abcdef0123456789',
    },
  ],
};

describe('ReportBuilderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportBuilderComponent],
    }).compileComponents();
  });

  function render(report: CsrdReportView | null) {
    const fixture = TestBed.createComponent(ReportBuilderComponent);
    fixture.componentRef.setInput('report', report);
    fixture.detectChanges();
    return fixture;
  }

  it('prompts to generate when there is no report', () => {
    const el = render(null).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pick a standard and generate');
  });

  it('renders mapped metrics and audit annotations', () => {
    const el = render(view).nativeElement as HTMLElement;
    expect(el.textContent).toContain('GRI 201-1');
    expect(el.textContent).toContain('EUR 125,000.00');
    expect(el.textContent).toContain('Audit annotations');
    expect(el.textContent).toContain('abcdef012345…');
  });

  it('emits generate/export with the selected standard', () => {
    const fixture = render(null);
    const gen: string[] = [];
    const csv: string[] = [];
    const pdf: string[] = [];
    fixture.componentInstance.generate.subscribe((s) => gen.push(s));
    fixture.componentInstance.exportCsv.subscribe((s) => csv.push(s));
    fixture.componentInstance.exportPdf.subscribe((s) => pdf.push(s));
    fixture.componentInstance.standard = 'UN_SDG';
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click(); // Generate
    (buttons[1] as HTMLButtonElement).click(); // CSV
    (buttons[2] as HTMLButtonElement).click(); // PDF
    expect(gen).toEqual(['UN_SDG']);
    expect(csv).toEqual(['UN_SDG']);
    expect(pdf).toEqual(['UN_SDG']);
  });
});
