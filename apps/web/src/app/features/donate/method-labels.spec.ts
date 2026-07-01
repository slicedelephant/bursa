import { isLocalMethod, methodBadge, methodLabel } from './method-labels';

describe('method-labels (E20)', () => {
  it('labels each method', () => {
    expect(methodLabel('MPESA')).toBe('M-Pesa');
    expect(methodLabel('GCASH')).toBe('GCash');
    expect(methodLabel('BKASH')).toBe('bKash');
    expect(methodLabel('LOCAL_BANK_TRANSFER')).toBe('Local bank transfer');
    expect(methodLabel('CARD')).toBe('Card');
    expect(methodLabel('SEPA')).toBe('SEPA transfer');
    expect(methodLabel('MOBILE_MONEY')).toBe('Mobile Money');
  });

  it('falls back to the raw value', () => {
    expect(methodLabel('X' as never)).toBe('X');
  });

  it('greens local methods and neutralizes card/SEPA', () => {
    expect(methodBadge('MPESA')).toContain('brand-green');
    expect(methodBadge('CARD')).toContain('slate2');
    expect(methodBadge('SEPA')).toContain('slate2');
  });

  it('flags local vs global methods', () => {
    expect(isLocalMethod('MPESA')).toBe(true);
    expect(isLocalMethod('CARD')).toBe(false);
    expect(isLocalMethod('SEPA')).toBe(false);
  });
});
