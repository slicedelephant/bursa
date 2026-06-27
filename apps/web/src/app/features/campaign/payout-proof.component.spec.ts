import { TestBed } from '@angular/core/testing';
import { PayoutProof } from '../../core/models';
import { PayoutProofComponent } from './payout-proof.component';

describe('PayoutProofComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutProofComponent],
    }).compileComponents();
  });

  function render(proof: PayoutProof | null): HTMLElement {
    const fixture = TestBed.createComponent(PayoutProofComponent);
    fixture.componentRef.setInput('proof', proof);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const proof: PayoutProof = {
    schoolName: 'London Business School',
    amountCents: 1_500_000,
    reference: 'BURSA-PAYOUT-7F3A',
    status: 'CONFIRMED',
    sentAt: '2026-06-20T09:30:00.000Z',
  };

  it('shows school, amount, reference and date for a disbursed payout', () => {
    const el = render(proof);
    const text = el.textContent ?? '';
    expect(text).toContain('London Business School');
    expect(text).toContain('15,000');
    expect(text).toContain('BURSA-PAYOUT-7F3A');
    expect(text).toContain('2026');
    expect(text).not.toContain('will appear here');
  });

  it('still renders cleanly when the payout has no sent date yet', () => {
    const el = render({ ...proof, sentAt: null });
    const text = el.textContent ?? '';
    expect(text).toContain('London Business School');
    expect(text).toContain('BURSA-PAYOUT-7F3A');
  });

  it('falls back to the direct-payout promise when there is no proof', () => {
    const el = render(null);
    const text = el.textContent ?? '';
    expect(text).toContain('directly to the school');
    expect(text).not.toContain('BURSA-PAYOUT-7F3A');
  });
});
