import { quoteLockedRate, type RateTableEntry } from './locked-rate';

const NOW = new Date('2026-07-01T10:00:00.000Z');
const TABLE: RateTableEntry[] = [
  { base: 'USD', quote: 'KES', rate: 129.5 },
  { base: 'EUR', quote: 'USD', rate: 1.08 },
];

describe('quoteLockedRate (E20)', () => {
  it('freezes a direct rate with the injected now', () => {
    const q = quoteLockedRate({
      base: 'USD',
      quote: 'KES',
      table: TABLE,
      now: NOW,
    });
    expect(q.rate).toBe(129.5);
    expect(q.quotedAt).toBe('2026-07-01T10:00:00.000Z');
  });

  it('derives an inverse rate when only the reverse pair is in the table', () => {
    const q = quoteLockedRate({
      base: 'USD',
      quote: 'EUR',
      table: TABLE,
      now: NOW,
    });
    expect(q.rate).toBeCloseTo(1 / 1.08, 6);
  });

  it('returns a 1.0 identity for the same currency', () => {
    const q = quoteLockedRate({
      base: 'KES',
      quote: 'KES',
      table: TABLE,
      now: NOW,
    });
    expect(q.rate).toBe(1);
  });

  it('throws UNKNOWN_RATE_PAIR for an unknown pair', () => {
    expect(() =>
      quoteLockedRate({ base: 'NGN', quote: 'PHP', table: TABLE, now: NOW }),
    ).toThrow('No rate for NGN->PHP');
  });

  it('throws on an unknown currency', () => {
    expect(() =>
      quoteLockedRate({
        base: 'XXX' as never,
        quote: 'KES',
        table: TABLE,
        now: NOW,
      }),
    ).toThrow('Unsupported currency');
  });
});
