import {
  giftTiers,
  isFullTuition,
  remainingGapCents,
  tierAmount,
} from './gift-tiers.util';

describe('remainingGapCents', () => {
  it('returns the open gap', () => {
    expect(remainingGapCents(100_000, 40_000)).toBe(60_000);
  });
  it('never goes negative', () => {
    expect(remainingGapCents(100_000, 120_000)).toBe(0);
  });
});

describe('giftTiers', () => {
  it('builds semester/year/full capped at the remaining gap', () => {
    const tiers = giftTiers(100_000, 0);
    expect(tiers.map((t) => t.tier)).toEqual(['SEMESTER', 'YEAR', 'FULL']);
    expect(tiers.find((t) => t.tier === 'SEMESTER')?.amountCents).toBe(25_000);
    expect(tiers.find((t) => t.tier === 'YEAR')?.amountCents).toBe(50_000);
    expect(tiers.find((t) => t.tier === 'FULL')?.amountCents).toBe(100_000);
    expect(tiers.find((t) => t.tier === 'FULL')?.highlight).toBe(true);
  });

  it('caps presets at the remaining gap when partly funded', () => {
    const tiers = giftTiers(100_000, 70_000); // gap 30_000
    expect(tiers.find((t) => t.tier === 'SEMESTER')?.amountCents).toBe(25_000);
    expect(tiers.find((t) => t.tier === 'YEAR')?.amountCents).toBe(30_000); // capped
    expect(tiers.find((t) => t.tier === 'FULL')?.amountCents).toBe(30_000);
  });

  it('returns no tiers when the gap is closed', () => {
    expect(giftTiers(100_000, 100_000)).toEqual([]);
  });
});

describe('tierAmount', () => {
  it('resolves a named tier to its capped amount', () => {
    expect(tierAmount('YEAR', 100_000, 0)).toBe(50_000);
    expect(tierAmount('FULL', 100_000, 60_000)).toBe(40_000);
  });
  it('uses the custom amount for CUSTOM', () => {
    expect(tierAmount('CUSTOM', 100_000, 0, 7_500)).toBe(7_500);
  });
  it('falls back to zero for CUSTOM without an amount', () => {
    expect(tierAmount('CUSTOM', 100_000, 0)).toBe(0);
  });
});

describe('isFullTuition', () => {
  it('is true when the amount covers the remaining gap', () => {
    expect(isFullTuition(60_000, 100_000, 40_000)).toBe(true);
    expect(isFullTuition(80_000, 100_000, 40_000)).toBe(true); // over the gap still counts
  });
  it('is false below the gap', () => {
    expect(isFullTuition(50_000, 100_000, 40_000)).toBe(false);
  });
  it('is false when there is no gap', () => {
    expect(isFullTuition(10_000, 100_000, 100_000)).toBe(false);
  });
});
