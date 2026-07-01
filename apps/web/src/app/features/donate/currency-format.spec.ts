import { currencyDecimals, currencySymbol, formatMinor, toMinor } from './currency-format';

describe('currency-format (E20)', () => {
  it('returns decimals per currency', () => {
    expect(currencyDecimals('KES')).toBe(2);
    expect(currencyDecimals('XXX' as never)).toBe(2);
  });

  it('returns the display symbol', () => {
    expect(currencySymbol('KES')).toBe('KSh');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('XXX' as never)).toBe('XXX');
  });

  it('formats minor units for display', () => {
    expect(formatMinor(6475, 'KES')).toBe('KSh 64.75');
    expect(formatMinor(1234, 'EUR')).toBe('€ 12.34');
  });

  it('converts major to minor units', () => {
    expect(toMinor(64.75, 'KES')).toBe(6475);
    expect(toMinor(12.34, 'EUR')).toBe(1234);
  });
});
