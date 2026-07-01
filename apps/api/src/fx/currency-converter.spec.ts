import { convertMinorUnits } from './currency-converter';

describe('convertMinorUnits (E20 locked-rate)', () => {
  it('converts USD minor units to KES at a locked rate (round half up)', () => {
    // 50.00 USD * 129.5 = 6475.00 KES -> 647500 minor units
    const result = convertMinorUnits({
      amountMinor: 5000,
      from: 'USD',
      to: 'KES',
      lockedRate: 129.5,
    });
    expect(result.amountMinor).toBe(647500);
    expect(result.rate).toBe(129.5);
    expect(result.to).toBe('KES');
  });

  it('rounds half up to the target decimals', () => {
    // 1.00 USD * 1.005 = 1.005 EUR -> 100.5 minor -> 101
    const result = convertMinorUnits({
      amountMinor: 100,
      from: 'USD',
      to: 'EUR',
      lockedRate: 1.005,
    });
    expect(result.amountMinor).toBe(101);
  });

  it('is an identity no-op for the same currency, ignoring the rate', () => {
    const result = convertMinorUnits({
      amountMinor: 1234,
      from: 'EUR',
      to: 'EUR',
      lockedRate: 999,
    });
    expect(result.amountMinor).toBe(1234);
    expect(result.rate).toBe(1);
  });

  it('rejects a non-integer minor amount', () => {
    expect(() =>
      convertMinorUnits({
        amountMinor: 12.5,
        from: 'USD',
        to: 'KES',
        lockedRate: 129.5,
      }),
    ).toThrow('integer in minor units');
  });

  it('rejects a non-positive rate on a cross-currency conversion', () => {
    expect(() =>
      convertMinorUnits({
        amountMinor: 100,
        from: 'USD',
        to: 'KES',
        lockedRate: 0,
      }),
    ).toThrow('No valid rate');
  });

  it('throws on an unknown currency', () => {
    expect(() =>
      convertMinorUnits({
        amountMinor: 100,
        from: 'XXX' as never,
        to: 'KES',
        lockedRate: 1,
      }),
    ).toThrow('Unsupported currency');
  });
});
