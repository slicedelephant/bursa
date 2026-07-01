import {
  assertMinorAmount,
  formatMinorUnits,
  fromMinorUnits,
  minorFactor,
  roundHalfUp,
  toMinorUnits,
} from './money-minor-unit';

describe('minor-unit money helpers (E20)', () => {
  it('rounds half up symmetrically', () => {
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(1.4)).toBe(1);
    expect(roundHalfUp(-1.5)).toBe(-2);
    expect(roundHalfUp(2)).toBe(2);
  });

  it('computes the minor factor from decimals', () => {
    expect(minorFactor(2)).toBe(100);
    expect(minorFactor(0)).toBe(1);
  });

  it('converts major to integer minor units', () => {
    expect(toMinorUnits(12.34, 'EUR')).toBe(1234);
    expect(toMinorUnits(64.75, 'KES')).toBe(6475);
    expect(Number.isInteger(toMinorUnits(0.1 + 0.2, 'USD'))).toBe(true);
  });

  it('converts minor units back to major', () => {
    expect(fromMinorUnits(1234, 'EUR')).toBeCloseTo(12.34, 5);
  });

  it('accepts a positive integer minor amount', () => {
    expect(assertMinorAmount(5000)).toBe(5000);
  });

  it('rejects non-integer or non-positive amounts', () => {
    expect(() => assertMinorAmount(12.5)).toThrow(
      'Amount must be a positive integer',
    );
    expect(() => assertMinorAmount(0)).toThrow('positive integer');
    expect(() => assertMinorAmount(-1)).toThrow('positive integer');
  });

  it('formats minor units for display with the currency symbol', () => {
    expect(formatMinorUnits(6475, 'KES')).toBe('KSh 64.75');
    expect(formatMinorUnits(1234, 'EUR')).toBe('€ 12.34');
  });

  it('throws on an unknown currency via assertCurrency', () => {
    expect(() => toMinorUnits(1, 'XXX' as never)).toThrow(
      'Unsupported currency',
    );
  });
});
