import { TestBed } from '@angular/core/testing';
import { DonorDonation } from '../../core/models';
import { DonationHistoryComponent } from './donation-history.component';

describe('DonationHistoryComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonationHistoryComponent],
    }).compileComponents();
  });

  function render(donations: DonorDonation[]) {
    const fixture = TestBed.createComponent(DonationHistoryComponent);
    fixture.componentRef.setInput('donations', donations);
    fixture.detectChanges();
    return fixture;
  }

  const donation = (over: Partial<DonorDonation> = {}): DonorDonation => ({
    id: 'd1',
    campaignId: 'c1',
    campaignTitle: 'Help Amara study',
    schoolName: 'ESMT Berlin',
    amountCents: 5000,
    currency: 'EUR',
    status: 'CAPTURED',
    method: 'CARD',
    tribute: null,
    anonymous: false,
    recurring: false,
    createdAt: new Date().toISOString(),
    ...over,
  });

  it('renders a donation with amount and a receipt button', () => {
    const fixture = render([donation()]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Help Amara study');
    expect(el.textContent).toContain('50');
    expect(el.textContent).toContain('View receipt');
  });

  it('shows tribute, monthly and anonymous badges', () => {
    const el = render([
      donation({ tribute: 'In memory of Ada', recurring: true, anonymous: true }),
    ]).nativeElement as HTMLElement;
    expect(el.textContent).toContain('In memory of Ada');
    expect(el.textContent).toContain('Monthly');
    expect(el.textContent).toContain('Anonymous');
  });

  it('hides the receipt button for a pledged (not yet captured) donation', () => {
    const el = render([donation({ status: 'PLEDGED' })]).nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('View receipt');
  });

  it('emits the donation id when requesting a receipt', () => {
    const fixture = render([donation()]);
    let emitted: string | undefined;
    fixture.componentInstance.receipt.subscribe((id) => (emitted = id));
    (fixture.nativeElement as HTMLElement).querySelector('button')?.dispatchEvent(new Event('click'));
    expect(emitted).toBe('d1');
  });

  it('shows an empty state', () => {
    const el = render([]).nativeElement as HTMLElement;
    expect(el.textContent).toContain("You haven't donated yet");
  });
});
