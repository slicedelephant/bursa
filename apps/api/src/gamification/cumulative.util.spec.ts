import { aggregateContributions } from './cumulative.util';

describe('aggregateContributions', () => {
  it('returns zeros for no contributions', () => {
    expect(aggregateContributions([])).toEqual({
      totalCents: 0,
      contributionCount: 0,
      distinctTargets: 0,
      impactPerTargetCents: 0,
      firstMonth: null,
      lastMonth: null,
    });
  });

  it('sums value, counts contributions and distinct targets', () => {
    const res = aggregateContributions([
      { targetId: 't1', valueCents: 5000, at: '2026-01-10' },
      { targetId: 't1', valueCents: 3000, at: '2026-02-10' },
      { targetId: 't2', valueCents: 2000, at: '2026-03-10' },
    ]);
    expect(res.totalCents).toBe(10000);
    expect(res.contributionCount).toBe(3);
    expect(res.distinctTargets).toBe(2);
  });

  it('computes integer impact per target (floored)', () => {
    const res = aggregateContributions([
      { targetId: 'a', valueCents: 100, at: '2026-01-01' },
      { targetId: 'b', valueCents: 100, at: '2026-01-01' },
      { targetId: 'c', valueCents: 101, at: '2026-01-01' },
    ]);
    // 301 / 3 = 100.33 -> 100
    expect(res.impactPerTargetCents).toBe(100);
  });

  it('reports first and last active month', () => {
    const res = aggregateContributions([
      { targetId: 'a', valueCents: 1, at: '2026-03-10' },
      { targetId: 'b', valueCents: 1, at: '2025-12-31' },
      { targetId: 'c', valueCents: 1, at: '2026-06-01' },
    ]);
    expect(res.firstMonth).toBe('2025-12');
    expect(res.lastMonth).toBe('2026-06');
  });

  it('accepts Date objects', () => {
    const res = aggregateContributions([
      { targetId: 'a', valueCents: 500, at: new Date('2026-04-15') },
    ]);
    expect(res.firstMonth).toBe('2026-04');
    expect(res.lastMonth).toBe('2026-04');
    expect(res.impactPerTargetCents).toBe(500);
  });

  it('does not mutate the input', () => {
    const input = [{ targetId: 'a', valueCents: 1, at: '2026-01-01' }];
    const snapshot = JSON.stringify(input);
    aggregateContributions(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
