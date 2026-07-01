import {
  isMethodAvailable,
  resolvePaymentMethods,
} from './payment-method-resolver';

describe('resolvePaymentMethods (E20)', () => {
  it('returns M-Pesa first plus card fallback for Kenya', () => {
    const r = resolvePaymentMethods('KE');
    expect(r.methods[0]).toBe('MPESA');
    expect(r.methods).toContain('CARD');
    expect(r.country).toBe('KE');
  });

  it('returns GCash for the Philippines', () => {
    expect(resolvePaymentMethods('ph').methods).toContain('GCASH');
  });

  it('returns bKash for Bangladesh', () => {
    expect(resolvePaymentMethods('BD').methods).toContain('BKASH');
  });

  it('normalizes the country code to uppercase', () => {
    expect(resolvePaymentMethods('ng').country).toBe('NG');
  });

  it('returns only card for an unknown country', () => {
    expect(resolvePaymentMethods('ZZ').methods).toEqual(['CARD']);
  });

  it('always includes card as the last (fallback) method', () => {
    const r = resolvePaymentMethods('KE');
    expect(r.methods[r.methods.length - 1]).toBe('CARD');
  });

  it('reports method availability per country', () => {
    expect(isMethodAvailable('KE', 'MPESA')).toBe(true);
    expect(isMethodAvailable('KE', 'GCASH')).toBe(false);
    expect(isMethodAvailable('KE', 'CARD')).toBe(true);
  });
});
