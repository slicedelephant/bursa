import { displayPayoutMinor, fxSummary, rateLine } from './fx-display';

describe('fx-display (E20)', () => {
  it('converts deposit minor to payout minor at the locked rate', () => {
    // 50.00 USD * 129.5 = 6475.00 KES
    expect(displayPayoutMinor(5000, 'USD', 'KES', 129.5)).toBe(647500);
  });

  it('is an identity for the same currency', () => {
    expect(displayPayoutMinor(5000, 'KES', 'KES', 999)).toBe(5000);
  });

  it('summarizes what the donor pays and the school receives', () => {
    const s = fxSummary(5000, 'USD', 'KES', 129.5);
    expect(s).toContain('$ 50.00');
    expect(s).toContain('KSh 6475.00');
    expect(s).toContain('School receives');
  });

  it('renders a locked rate line', () => {
    expect(rateLine('USD', 'KES', 129.5)).toBe('1 USD = 129.5 KES (locked)');
  });

  it('notes no conversion for the same currency', () => {
    expect(rateLine('KES', 'KES', 1)).toContain('no conversion');
  });
});
