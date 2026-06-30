import { TestBed } from '@angular/core/testing';
import { MatchBalance } from '../../core/models';
import { MatchBalanceComponent } from './match-balance.component';

describe('MatchBalanceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchBalanceComponent],
    }).compileComponents();
  });

  function render(balance: MatchBalance) {
    const fixture = TestBed.createComponent(MatchBalanceComponent);
    fixture.componentRef.setInput('balance', balance);
    fixture.detectChanges();
    return fixture;
  }

  const base: MatchBalance = {
    employerName: 'SAP',
    domain: 'sap.com',
    year: 2026,
    annualCapCents: 500_000,
    usedCents: 200_000,
    remainingAnnualCents: 300_000,
    claims: [],
  };

  it('shows the remaining balance and employer for a detected employer', () => {
    const el = render(base).nativeElement as HTMLElement;
    expect(el.textContent).toContain('SAP');
    expect(el.textContent).toContain('€3000 match still available this year');
    expect(el.textContent).toContain('2026');
  });

  it('renders a progress bar at the used percentage', () => {
    const el = render(base).nativeElement as HTMLElement;
    const bar = el.querySelector('.bg-brand-green.h-full') as HTMLElement | null;
    expect(bar?.style.width).toBe('40%');
  });

  it('shows the empty state with no employer', () => {
    const el = render({
      year: 2026,
      usedCents: 0,
      claims: [],
    }).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No employer match detected yet');
  });
});
