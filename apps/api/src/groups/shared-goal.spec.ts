import { computeSharedGoal } from './shared-goal';

describe('computeSharedGoal', () => {
  it('sums the parts against the goal', () => {
    const result = computeSharedGoal({
      parts: [{ valueCents: 1_200_000 }, { valueCents: 800_000 }],
      goalCents: 3_000_000,
    });
    expect(result).toEqual({
      raisedCents: 2_000_000,
      goalCents: 3_000_000,
      percent: 66,
      remainingCents: 1_000_000,
    });
  });

  it('caps percent at 100 and remaining at 0 when over-funded', () => {
    const result = computeSharedGoal({
      parts: [{ valueCents: 5_000_000 }],
      goalCents: 3_000_000,
    });
    expect(result.percent).toBe(100);
    expect(result.remainingCents).toBe(0);
  });

  it('returns 0 percent when the goal is 0', () => {
    const result = computeSharedGoal({
      parts: [{ valueCents: 100 }],
      goalCents: 0,
    });
    expect(result.percent).toBe(0);
    expect(result.remainingCents).toBe(0);
    expect(result.raisedCents).toBe(100);
  });

  it('ignores negative part values', () => {
    const result = computeSharedGoal({
      parts: [{ valueCents: -500 }, { valueCents: 1000 }],
      goalCents: 2000,
    });
    expect(result.raisedCents).toBe(1000);
  });

  it('handles an empty parts list', () => {
    const result = computeSharedGoal({ parts: [], goalCents: 1000 });
    expect(result).toEqual({
      raisedCents: 0,
      goalCents: 1000,
      percent: 0,
      remainingCents: 1000,
    });
  });

  it('clamps a negative goal to 0', () => {
    const result = computeSharedGoal({
      parts: [{ valueCents: 100 }],
      goalCents: -50,
    });
    expect(result.goalCents).toBe(0);
  });
});
