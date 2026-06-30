import { ReferralReward, ReferralStats } from '../../core/models';
import {
  bothWinText,
  conversionText,
  nextTierText,
  perkText,
  rewardTierLabel,
  trackingTiles,
} from './referral-stats-format';

const stats: ReferralStats = {
  invited: 14,
  donated: 5,
  active: 2,
  conversionPct: 35.7,
  viralCoefficient: 0.36,
  label: '14 invited, 5 donated, 2 active',
};

const reward = (over: Partial<ReferralReward> = {}): ReferralReward => ({
  count: 5,
  tier: 'SILVER',
  nextTier: 'GOLD',
  toNext: 5,
  perk: 'RECAP',
  bothWin: true,
  ...over,
});

describe('referral-stats-format', () => {
  it('builds the three tracking tiles', () => {
    expect(trackingTiles(stats)).toEqual([
      { label: 'Invited', value: '14' },
      { label: 'Donated', value: '5' },
      { label: 'Active', value: '2' },
    ]);
  });

  it('phrases the conversion rate', () => {
    expect(conversionText(stats)).toBe('35.7% of the people you invited have donated');
  });

  it('labels every reward tier', () => {
    expect(rewardTierLabel(reward({ tier: 'NONE' }))).toBe('Getting started');
    expect(rewardTierLabel(reward({ tier: 'BRONZE' }))).toBe('Bronze advocate');
    expect(rewardTierLabel(reward({ tier: 'SILVER' }))).toBe('Silver advocate');
    expect(rewardTierLabel(reward({ tier: 'GOLD' }))).toBe('Gold advocate');
  });

  it('describes every perk', () => {
    expect(perkText(reward({ perk: 'NONE' }))).toContain('Refer 3 friends');
    expect(perkText(reward({ perk: 'SHOUT_OUT' }))).toContain('shout-out');
    expect(perkText(reward({ perk: 'RECAP' }))).toContain('recap');
    expect(perkText(reward({ perk: 'RECOGNITION' }))).toContain('recognition');
  });

  it('nudges toward the next tier with correct pluralisation', () => {
    expect(nextTierText(reward({ toNext: 5, nextTier: 'GOLD' }))).toBe(
      '5 more referrals to reach Gold advocate',
    );
    expect(nextTierText(reward({ toNext: 1, nextTier: 'SILVER' }))).toBe(
      '1 more referral to reach Silver advocate',
    );
  });

  it('celebrates the top tier', () => {
    expect(nextTierText(reward({ nextTier: null, toNext: null }))).toContain('top advocate tier');
  });

  it('switches both-win text on the unlock state', () => {
    expect(bothWinText(reward({ bothWin: true }))).toContain('Both-win unlocked');
    expect(bothWinText(reward({ bothWin: false }))).toContain('first gift, you both earn');
  });
});
