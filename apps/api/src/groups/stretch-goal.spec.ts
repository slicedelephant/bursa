import {
  DEFAULT_STRETCH_THRESHOLD_PCT,
  decideStretchGoal,
} from './stretch-goal';

describe('decideStretchGoal', () => {
  it('unlocks at exactly the threshold (default 80%)', () => {
    const result = decideStretchGoal({
      raisedCents: 2_400_000,
      goalCents: 3_000_000,
    });
    expect(result.thresholdPct).toBe(DEFAULT_STRETCH_THRESHOLD_PCT);
    expect(result.thresholdCents).toBe(2_400_000);
    expect(result.unlocked).toBe(true);
    expect(result.remainingToStretchCents).toBe(0);
  });

  it('stays locked just below the threshold', () => {
    const result = decideStretchGoal({
      raisedCents: 2_399_999,
      goalCents: 3_000_000,
    });
    expect(result.unlocked).toBe(false);
    expect(result.remainingToStretchCents).toBe(1);
  });

  it('respects a custom threshold percent', () => {
    const result = decideStretchGoal({
      raisedCents: 500_000,
      goalCents: 1_000_000,
      thresholdPct: 50,
    });
    expect(result.thresholdPct).toBe(50);
    expect(result.thresholdCents).toBe(500_000);
    expect(result.unlocked).toBe(true);
  });

  it('reports an uncapped percent when over-funded', () => {
    const result = decideStretchGoal({
      raisedCents: 3_600_000,
      goalCents: 3_000_000,
    });
    expect(result.percent).toBe(120);
    expect(result.unlocked).toBe(true);
  });

  it('never unlocks a zero goal', () => {
    const result = decideStretchGoal({ raisedCents: 100, goalCents: 0 });
    expect(result.unlocked).toBe(false);
    expect(result.percent).toBe(0);
  });

  it('clamps an out-of-range threshold into 1..100', () => {
    expect(
      decideStretchGoal({ raisedCents: 0, goalCents: 100, thresholdPct: 0 })
        .thresholdPct,
    ).toBe(1);
    expect(
      decideStretchGoal({ raisedCents: 0, goalCents: 100, thresholdPct: 999 })
        .thresholdPct,
    ).toBe(100);
  });

  it('falls back to the default for an undefined threshold', () => {
    const result = decideStretchGoal({ raisedCents: 0, goalCents: 100 });
    expect(result.thresholdPct).toBe(DEFAULT_STRETCH_THRESHOLD_PCT);
  });
});
