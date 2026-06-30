import { TestBed } from '@angular/core/testing';
import { MatchBalanceClaim } from '../../core/models';
import { ClaimHistoryComponent } from './claim-history.component';

describe('ClaimHistoryComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClaimHistoryComponent],
    }).compileComponents();
  });

  function render(claims: MatchBalanceClaim[]) {
    const fixture = TestBed.createComponent(ClaimHistoryComponent);
    fixture.componentRef.setInput('claims', claims);
    fixture.detectChanges();
    return fixture;
  }

  const claim = (over: Partial<MatchBalanceClaim> = {}): MatchBalanceClaim => ({
    id: 'c1',
    employerName: 'SAP',
    matchCents: 15_000,
    status: 'CLAIMED',
    statusLabel: 'Claimed',
    campaignTitle: 'Help Amara study',
    schoolName: 'ESMT',
    createdAt: new Date().toISOString(),
    ...over,
  });

  it('renders a claim with employer, school and status', () => {
    const el = render([claim()]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Help Amara study');
    expect(el.textContent).toContain('SAP');
    expect(el.textContent).toContain('ESMT');
    expect(el.textContent).toContain('Claimed');
  });

  it('applies the status tone class', () => {
    const el = render([claim({ status: 'APPROVED', statusLabel: 'Approved' })])
      .nativeElement as HTMLElement;
    const badge = Array.from(el.querySelectorAll('span')).find((s) =>
      s.textContent?.includes('Approved'),
    ) as HTMLElement | undefined;
    expect(badge?.classList.contains('bg-brand-green')).toBe(true);
  });

  it('shows an empty state', () => {
    const el = render([]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('No employer match claims yet');
  });
});
