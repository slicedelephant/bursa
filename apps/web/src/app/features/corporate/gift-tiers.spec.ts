import { giftTiers, isFullTuition, remainingGapCents, tierBadge, tierName } from './gift-tiers';

describe('remainingGapCents', () => {
  it('returns the gap and never negative', () => {
    expect(remainingGapCents(100_000, 40_000)).toBe(60_000);
    expect(remainingGapCents(100_000, 130_000)).toBe(0);
  });
});

describe('giftTiers', () => {
  it('builds semester/year/full capped at the gap', () => {
    const tiers = giftTiers(100_000, 0);
    expect(tiers.map((t) => t.tier)).toEqual(['SEMESTER', 'YEAR', 'FULL']);
    expect(tiers.find((t) => t.tier === 'FULL')?.amountCents).toBe(100_000);
    expect(tiers.find((t) => t.tier === 'FULL')?.highlight).toBe(true);
  });
  it('caps presets at the remaining gap', () => {
    const tiers = giftTiers(100_000, 80_000); // gap 20_000
    expect(tiers.find((t) => t.tier === 'SEMESTER')?.amountCents).toBe(20_000);
    expect(tiers.find((t) => t.tier === 'FULL')?.amountCents).toBe(20_000);
  });
  it('is empty when the gap is closed', () => {
    expect(giftTiers(100_000, 100_000)).toEqual([]);
  });
});

describe('isFullTuition', () => {
  it('is true when the amount covers the gap', () => {
    expect(isFullTuition(60_000, 100_000, 40_000)).toBe(true);
  });
  it('is false below the gap or when closed', () => {
    expect(isFullTuition(10_000, 100_000, 40_000)).toBe(false);
    expect(isFullTuition(10_000, 100_000, 100_000)).toBe(false);
  });
});

describe('tierBadge / tierName', () => {
  it('badges only the highlighted tier', () => {
    expect(tierBadge({ tier: 'FULL', label: 'x', amountCents: 1, highlight: true })).toBe('Highest impact');
    expect(tierBadge({ tier: 'YEAR', label: 'x', amountCents: 1 })).toBeNull();
  });
  it('names each tier', () => {
    expect(tierName('SEMESTER')).toBe('One semester');
    expect(tierName('YEAR')).toBe('One year');
    expect(tierName('FULL')).toBe('Full tuition');
    expect(tierName('CUSTOM')).toBe('Custom amount');
  });
});
