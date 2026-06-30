import { buildTrend, TrendLedgerFact, TrendScholarFact } from './esg-trend';

const entries: TrendLedgerFact[] = [
  {
    entryType: 'PAYOUT',
    amountCents: 80_00000,
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    entryType: 'DONATION',
    amountCents: 999_999,
    createdAt: '2025-05-01T00:00:00Z',
  }, // ignored (not invested)
  {
    entryType: 'PAYOUT',
    amountCents: 100_00000,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    entryType: 'DISBURSEMENT',
    amountCents: 25_00000,
    createdAt: '2026-06-01T00:00:00Z',
  },
];

const scholars: TrendScholarFact[] = [
  { gender: 'FEMALE', createdAt: '2025-02-01T00:00:00Z' },
  { gender: 'MALE', createdAt: '2025-02-01T00:00:00Z' },
  { gender: 'MALE', createdAt: '2025-02-01T00:00:00Z' },
  { gender: 'FEMALE', createdAt: '2026-02-01T00:00:00Z' },
  { gender: 'FEMALE', createdAt: '2026-02-01T00:00:00Z' },
  { gender: null, createdAt: '2026-02-01T00:00:00Z' }, // not gendered
];

describe('esg-trend', () => {
  it('sums invested euros per year from payouts + disbursements only', () => {
    const t = buildTrend(entries, scholars);
    const y2025 = t.years.find((y) => y.year === 2025)!;
    const y2026 = t.years.find((y) => y.year === 2026)!;
    expect(y2025.investedEur).toBe(80000);
    expect(y2026.investedEur).toBe(125000); // 100k + 25k
  });

  it('counts scholars per year and female share over gendered scholars', () => {
    const t = buildTrend(entries, scholars);
    const y2025 = t.years.find((y) => y.year === 2025)!;
    const y2026 = t.years.find((y) => y.year === 2026)!;
    expect(y2025.scholarCount).toBe(3);
    expect(y2025.femaleSharePct).toBe(33.3); // 1 of 3
    expect(y2026.scholarCount).toBe(3);
    // 2 female of 2 gendered (null excluded)
    expect(y2026.femaleSharePct).toBe(100);
  });

  it('computes year-over-year deltas', () => {
    const t = buildTrend(entries, scholars);
    expect(t.deltas).toHaveLength(1);
    const d = t.deltas[0];
    expect(d.year).toBe(2026);
    expect(d.investedEurDelta).toBe(45000);
    expect(d.scholarCountDelta).toBe(0);
    expect(d.femaleShareDeltaPct).toBe(66.7);
  });

  it('orders years ascending and yields no deltas for a single year', () => {
    const t = buildTrend(
      [{ entryType: 'PAYOUT', amountCents: 1000, createdAt: '2026-01-01' }],
      [{ gender: 'FEMALE', createdAt: '2026-01-01' }],
    );
    expect(t.years.map((y) => y.year)).toEqual([2026]);
    expect(t.deltas).toHaveLength(0);
  });

  it('handles empty input', () => {
    const t = buildTrend([], []);
    expect(t.years).toHaveLength(0);
    expect(t.deltas).toHaveLength(0);
  });
});
