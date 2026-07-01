import {
  assertCurrency,
  getCurrency,
  isCurrencyCode,
  listCurrencies,
} from './currency';

describe('currency registry (E20)', () => {
  it('recognizes supported codes', () => {
    expect(isCurrencyCode('KES')).toBe(true);
    expect(isCurrencyCode('EUR')).toBe(true);
    expect(isCurrencyCode('XXX')).toBe(false);
  });

  it('returns info for a known code', () => {
    const kes = getCurrency('KES');
    expect(kes).toEqual({
      code: 'KES',
      decimals: 2,
      symbol: 'KSh',
      name: 'Kenyan Shilling',
    });
  });

  it('returns undefined for an unknown code', () => {
    expect(getCurrency('XXX')).toBeUndefined();
  });

  it('assertCurrency returns info for a known code', () => {
    expect(assertCurrency('NGN').name).toBe('Nigerian Naira');
  });

  it('assertCurrency throws UNKNOWN_CURRENCY for an unknown code', () => {
    expect(() => assertCurrency('XXX')).toThrow('Unsupported currency: XXX');
  });

  it('lists all currencies sorted by code, as fresh copies', () => {
    const list = listCurrencies();
    const codes = list.map((c) => c.code);
    expect(codes).toEqual([...codes].sort());
    expect(codes).toContain('VND');
    // fresh copy — mutating the result must not affect the registry
    (list[0] as { symbol: string }).symbol = 'MUT';
    expect(getCurrency(list[0].code)?.symbol).not.toBe('MUT');
  });
});
