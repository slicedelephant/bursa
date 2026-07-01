import { MockFxRateProvider } from './mock-fx-rate.provider';

const CLOCK = () => new Date('2026-07-01T10:00:00.000Z');

describe('MockFxRateProvider (E20)', () => {
  const provider = new MockFxRateProvider(CLOCK);

  it('returns a direct USD-hub rate', async () => {
    const r = await provider.getRate({ base: 'USD', quote: 'KES' });
    expect(r.rate).toBe(129.5);
    expect(r.asOf).toBe('2026-07-01T10:00:00.000Z');
  });

  it('derives an inverse rate', async () => {
    const r = await provider.getRate({ base: 'KES', quote: 'USD' });
    expect(r.rate).toBeCloseTo(1 / 129.5, 8);
  });

  it('derives a cross rate through USD', async () => {
    const r = await provider.getRate({ base: 'EUR', quote: 'KES' });
    // KES per EUR = KES/USD ÷ EUR/USD = 129.5 / 0.92
    expect(r.rate).toBeCloseTo(129.5 / 0.92, 6);
  });

  it('returns 1.0 for the same currency', async () => {
    const r = await provider.getRate({ base: 'KES', quote: 'KES' });
    expect(r.rate).toBe(1);
  });

  it('throws UNKNOWN_RATE_PAIR for an unknown code', async () => {
    await expect(
      provider.getRate({ base: 'USD', quote: 'XXX' }),
    ).rejects.toThrow('No rate for USD->XXX');
  });

  it('exposes a full derived rate table', () => {
    const table = MockFxRateProvider.table();
    expect(table.find((e) => e.base === 'USD' && e.quote === 'KES')?.rate).toBe(
      129.5,
    );
    expect(table.length).toBeGreaterThan(10);
  });
});
