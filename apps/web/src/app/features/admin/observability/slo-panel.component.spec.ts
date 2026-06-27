import { TestBed } from '@angular/core/testing';
import { SloReport } from '../../../core/models';
import { SloPanelComponent } from './slo-panel.component';

const report = (alert: SloReport['alert']): SloReport => ({
  objectivePct: 99.9,
  errorBudgetPct: 0.1,
  windows: [
    { windowLabel: 'fast', sliPct: 99.95, burnRate: 0.5, budgetConsumedPct: 50 },
    { windowLabel: 'fast_short', sliPct: 98, burnRate: 20, budgetConsumedPct: 100 },
  ],
  alert,
});

describe('SloPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SloPanelComponent],
    }).compileComponents();
  });

  function render(alert: SloReport['alert']) {
    const fixture = TestBed.createComponent(SloPanelComponent);
    fixture.componentRef.setInput('report', report(alert));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders objective, windows and burn rates', () => {
    const el = render('none');
    expect(el.textContent).toContain('Objective 99.9%');
    expect(el.textContent).toContain('Fast (1h)');
    expect(el.textContent).toContain('20×');
  });

  it('shows the page banner on a fast burn', () => {
    const el = render('page');
    expect(el.textContent).toContain('PAGE');
  });

  it('shows the healthy banner within budget', () => {
    const el = render('none');
    expect(el.textContent).toContain('Healthy');
  });
});
