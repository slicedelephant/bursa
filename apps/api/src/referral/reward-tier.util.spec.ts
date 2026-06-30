import { REFERRAL_REWARD_THRESHOLDS, referralReward } from './reward-tier.util';

describe('reward-tier.util', () => {
  it('exposes the E15 thresholds 3/5/10', () => {
    expect(REFERRAL_REWARD_THRESHOLDS).toEqual([
      { tier: 'BRONZE', min: 3 },
      { tier: 'SILVER', min: 5 },
      { tier: 'GOLD', min: 10 },
    ]);
  });

  it('gives NONE with no perk at 0 referrals and no both-win', () => {
    expect(referralReward(0)).toEqual({
      count: 0,
      tier: 'NONE',
      nextTier: 'BRONZE',
      toNext: 3,
      perk: 'NONE',
      bothWin: false,
    });
  });

  it('flags both-win from the first referral but still NONE tier', () => {
    const reward = referralReward(1);
    expect(reward.bothWin).toBe(true);
    expect(reward.tier).toBe('NONE');
    expect(reward.toNext).toBe(2);
  });

  it('reaches BRONZE / shout-out at 3', () => {
    expect(referralReward(3)).toMatchObject({
      tier: 'BRONZE',
      perk: 'SHOUT_OUT',
      nextTier: 'SILVER',
      toNext: 2,
    });
  });

  it('reaches SILVER / recap at 5', () => {
    expect(referralReward(5)).toMatchObject({
      tier: 'SILVER',
      perk: 'RECAP',
      nextTier: 'GOLD',
      toNext: 5,
    });
  });

  it('reaches GOLD / recognition at 10 with no next tier', () => {
    expect(referralReward(10)).toMatchObject({
      tier: 'GOLD',
      perk: 'RECOGNITION',
      nextTier: null,
      toNext: null,
    });
  });

  it('stays GOLD beyond the top threshold', () => {
    expect(referralReward(42).tier).toBe('GOLD');
  });

  it('floors and clamps non-integer / negative counts', () => {
    expect(referralReward(3.9).count).toBe(3);
    expect(referralReward(3.9).tier).toBe('BRONZE');
    expect(referralReward(-4)).toMatchObject({
      count: 0,
      tier: 'NONE',
      bothWin: false,
    });
  });
});
