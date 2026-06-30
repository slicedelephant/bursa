import { computeReferralStats } from './referral-stats.util';

describe('referral-stats.util', () => {
  it('computes conversion, viral coefficient and label', () => {
    expect(
      computeReferralStats({ invited: 14, donated: 5, active: 2 }),
    ).toEqual({
      invited: 14,
      donated: 5,
      active: 2,
      conversionPct: 35.7,
      viralCoefficient: 0.36,
      label: '14 invited, 5 donated, 2 active',
    });
  });

  it('returns zero rates when nobody was invited', () => {
    expect(computeReferralStats({ invited: 0, donated: 0, active: 0 })).toEqual(
      {
        invited: 0,
        donated: 0,
        active: 0,
        conversionPct: 0,
        viralCoefficient: 0,
        label: '0 invited, 0 donated, 0 active',
      },
    );
  });

  it('clamps donated to invited and active to donated', () => {
    const stats = computeReferralStats({ invited: 3, donated: 9, active: 9 });
    expect(stats.donated).toBe(3);
    expect(stats.active).toBe(3);
    expect(stats.conversionPct).toBe(100);
    expect(stats.viralCoefficient).toBe(1);
  });

  it('floors and clamps negative / fractional inputs', () => {
    const stats = computeReferralStats({
      invited: 10.7,
      donated: -1,
      active: 2.9,
    });
    expect(stats.invited).toBe(10);
    expect(stats.donated).toBe(0);
    expect(stats.active).toBe(0);
  });

  it('reaches a viral coefficient above 1 only when donated tops invited (clamped)', () => {
    // Even with donated > invited, the clamp keeps it at most 1.0.
    expect(
      computeReferralStats({ invited: 5, donated: 8, active: 0 })
        .viralCoefficient,
    ).toBe(1);
  });
});
