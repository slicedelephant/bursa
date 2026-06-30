import { computeMatch, remainingAnnualCents } from './match-amount';

describe('remainingAnnualCents', () => {
  it('subtracts used from the cap', () => {
    expect(remainingAnnualCents(500_000, 200_000)).toBe(300_000);
  });
  it('clamps to 0 when used exceeds the cap', () => {
    expect(remainingAnnualCents(500_000, 600_000)).toBe(0);
  });
  it('treats negative used as 0', () => {
    expect(remainingAnnualCents(500_000, -100)).toBe(500_000);
  });
});

describe('computeMatch', () => {
  it('matches 1:1 below the remaining balance', () => {
    const r = computeMatch(10_000, 100, 500_000);
    expect(r.matchCents).toBe(10_000);
    expect(r.uncappedMatchCents).toBe(10_000);
    expect(r.remainingAfterCents).toBe(490_000);
    expect(r.capped).toBe(false);
  });

  it('matches 2:1', () => {
    const r = computeMatch(10_000, 200, 500_000);
    expect(r.matchCents).toBe(20_000);
    expect(r.capped).toBe(false);
  });

  it('caps the match at the remaining balance', () => {
    const r = computeMatch(10_000, 100, 6_000);
    expect(r.uncappedMatchCents).toBe(10_000);
    expect(r.matchCents).toBe(6_000);
    expect(r.remainingAfterCents).toBe(0);
    expect(r.capped).toBe(true);
  });

  it('returns 0 when no balance remains', () => {
    const r = computeMatch(10_000, 100, 0);
    expect(r.matchCents).toBe(0);
    expect(r.capped).toBe(true);
  });

  it('floors fractional matches and a half ratio', () => {
    // 50% ratio of 333 cents = 166.5 → floored to 166.
    const r = computeMatch(333, 50, 500_000);
    expect(r.matchCents).toBe(166);
  });

  it('treats a negative donation as 0', () => {
    expect(computeMatch(-100, 100, 500_000).matchCents).toBe(0);
  });
});
