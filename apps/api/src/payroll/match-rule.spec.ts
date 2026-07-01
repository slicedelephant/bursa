import { applyPayrollMatchRule } from './match-rule';

describe('applyPayrollMatchRule (reuses E13 computeMatch)', () => {
  it('matches 1:1 below the per-employee cap', () => {
    const r = applyPayrollMatchRule({
      contributionCents: 10_000,
      matchRatio: 100,
      perEmployeeCapCents: 50_000,
      usedCents: 0,
    });
    expect(r.matchCents).toBe(10_000);
    expect(r.capped).toBe(false);
    expect(r.remainingAfterCents).toBe(40_000);
    expect(r.newUsedCents).toBe(10_000);
  });

  it('matches 2:1', () => {
    const r = applyPayrollMatchRule({
      contributionCents: 10_000,
      matchRatio: 200,
      perEmployeeCapCents: 50_000,
      usedCents: 0,
    });
    expect(r.matchCents).toBe(20_000);
  });

  it('caps the match at the remaining per-employee balance', () => {
    const r = applyPayrollMatchRule({
      contributionCents: 10_000,
      matchRatio: 100,
      perEmployeeCapCents: 50_000,
      usedCents: 46_000,
    });
    expect(r.uncappedMatchCents).toBe(10_000);
    expect(r.matchCents).toBe(4_000);
    expect(r.capped).toBe(true);
    expect(r.remainingAfterCents).toBe(0);
    expect(r.newUsedCents).toBe(50_000);
  });

  it('returns 0 when the cap is already exhausted', () => {
    const r = applyPayrollMatchRule({
      contributionCents: 10_000,
      matchRatio: 100,
      perEmployeeCapCents: 50_000,
      usedCents: 50_000,
    });
    expect(r.matchCents).toBe(0);
    expect(r.capped).toBe(true);
    expect(r.newUsedCents).toBe(50_000);
  });

  it('treats negative prior usage as 0', () => {
    const r = applyPayrollMatchRule({
      contributionCents: 10_000,
      matchRatio: 100,
      perEmployeeCapCents: 50_000,
      usedCents: -100,
    });
    expect(r.matchCents).toBe(10_000);
    expect(r.newUsedCents).toBe(10_000);
  });
});
