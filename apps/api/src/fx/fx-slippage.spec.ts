import { computeFxSlippage } from './fx-slippage';

describe('computeFxSlippage (E20)', () => {
  it('reports a gain when the settled rate is higher than locked', () => {
    const s = computeFxSlippage({
      amountMinor: 5000, // 50.00 USD
      from: 'USD',
      to: 'KES',
      lockedRate: 129.5,
      settledRate: 130.0,
    });
    // locked: 647500, settled: 650000 -> +2500
    expect(s.slippageMinor).toBe(2500);
    expect(s.direction).toBe('GAIN');
    expect(s.slippageBps).toBeGreaterThan(0);
  });

  it('reports a loss when the settled rate is lower than locked', () => {
    const s = computeFxSlippage({
      amountMinor: 5000,
      from: 'USD',
      to: 'KES',
      lockedRate: 130.0,
      settledRate: 129.5,
    });
    expect(s.slippageMinor).toBeLessThan(0);
    expect(s.direction).toBe('LOSS');
    expect(s.slippageBps).toBeLessThan(0);
  });

  it('reports flat when rates are equal', () => {
    const s = computeFxSlippage({
      amountMinor: 5000,
      from: 'USD',
      to: 'KES',
      lockedRate: 129.5,
      settledRate: 129.5,
    });
    expect(s.slippageMinor).toBe(0);
    expect(s.slippageBps).toBe(0);
    expect(s.direction).toBe('FLAT');
  });

  it('computes basis points relative to the locked rate', () => {
    const s = computeFxSlippage({
      amountMinor: 10000,
      from: 'USD',
      to: 'EUR',
      lockedRate: 1.0,
      settledRate: 1.01, // +1% = 100 bps
    });
    expect(s.slippageBps).toBe(100);
  });

  it('handles a zero locked rate without dividing by zero', () => {
    const s = computeFxSlippage({
      amountMinor: 100,
      from: 'USD',
      to: 'KES',
      lockedRate: 0,
      settledRate: 129.5,
    });
    expect(s.slippageBps).toBe(0);
  });
});
