import { monthlyGivingBadge, resolveTier } from './badge.util';

describe('resolveTier', () => {
  const thresholds = [
    { tier: 'BRONZE', min: 3 },
    { tier: 'SILVER', min: 6 },
    { tier: 'GOLD', min: 12 },
  ] as const;

  it('returns NONE below the first threshold', () => {
    const res = resolveTier(2, thresholds);
    expect(res.tier).toBe('NONE');
    expect(res.nextTier).toBe('BRONZE');
    expect(res.amountToNext).toBe(1);
  });

  it('resolves the highest crossed threshold', () => {
    expect(resolveTier(3, thresholds).tier).toBe('BRONZE');
    expect(resolveTier(7, thresholds).tier).toBe('SILVER');
    expect(resolveTier(12, thresholds).tier).toBe('GOLD');
  });

  it('reports the next tier and the distance to it', () => {
    const res = resolveTier(4, thresholds);
    expect(res.nextTier).toBe('SILVER');
    expect(res.amountToNext).toBe(2);
  });

  it('has no next tier at the top', () => {
    const res = resolveTier(20, thresholds);
    expect(res.tier).toBe('GOLD');
    expect(res.nextTier).toBeNull();
    expect(res.amountToNext).toBeNull();
  });
});

describe('monthlyGivingBadge', () => {
  it('maps zero streak to NONE with BRONZE next', () => {
    const b = monthlyGivingBadge(0);
    expect(b).toEqual({
      tier: 'NONE',
      streakMonths: 0,
      nextTier: 'BRONZE',
      monthsToNextTier: 3,
    });
  });

  it('maps a 3-month streak to BRONZE', () => {
    const b = monthlyGivingBadge(3);
    expect(b.tier).toBe('BRONZE');
    expect(b.nextTier).toBe('SILVER');
    expect(b.monthsToNextTier).toBe(3);
  });

  it('maps a 7-month streak to SILVER with GOLD next', () => {
    const b = monthlyGivingBadge(7);
    expect(b.tier).toBe('SILVER');
    expect(b.nextTier).toBe('GOLD');
    expect(b.monthsToNextTier).toBe(5);
  });

  it('maps a 12-month streak to GOLD with no next tier', () => {
    const b = monthlyGivingBadge(12);
    expect(b.tier).toBe('GOLD');
    expect(b.nextTier).toBeNull();
    expect(b.monthsToNextTier).toBeNull();
  });
});
