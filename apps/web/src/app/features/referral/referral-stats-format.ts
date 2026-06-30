// Pure presentation helpers for the referral tracking dashboard + reward tier (E15).
// No I/O; returns new values, never mutates inputs.

import { ReferralReward, ReferralStats } from '../../core/models';

export interface StatTile {
  readonly label: string;
  readonly value: string;
}

/** The three headline tracking tiles: invited / donated / active. */
export function trackingTiles(stats: ReferralStats): StatTile[] {
  return [
    { label: 'Invited', value: String(stats.invited) },
    { label: 'Donated', value: String(stats.donated) },
    { label: 'Active', value: String(stats.active) },
  ];
}

export function conversionText(stats: ReferralStats): string {
  return `${stats.conversionPct}% of the people you invited have donated`;
}

/** Human reward-tier name. */
export function rewardTierLabel(reward: ReferralReward): string {
  switch (reward.tier) {
    case 'BRONZE':
      return 'Bronze advocate';
    case 'SILVER':
      return 'Silver advocate';
    case 'GOLD':
      return 'Gold advocate';
    default:
      return 'Getting started';
  }
}

/** Describes the recognition perk unlocked at the current tier. */
export function perkText(reward: ReferralReward): string {
  switch (reward.perk) {
    case 'SHOUT_OUT':
      return 'Unlocked: a public shout-out on the campaign';
    case 'RECAP':
      return 'Unlocked: your name in the campaign recap';
    case 'RECOGNITION':
      return 'Unlocked: special recognition from the student';
    default:
      return 'Refer 3 friends to unlock your first recognition';
  }
}

/** Motivational nudge toward the next tier (no cash — recognition only). */
export function nextTierText(reward: ReferralReward): string {
  if (!reward.nextTier || reward.toNext === null) {
    return 'You’ve reached the top advocate tier — thank you!';
  }
  const remaining = reward.toNext;
  return `${remaining} more referral${remaining === 1 ? '' : 's'} to reach ${rewardTierLabel({
    ...reward,
    tier: reward.nextTier,
  })}`;
}

export function bothWinText(reward: ReferralReward): string {
  return reward.bothWin
    ? 'Both-win unlocked: you and your friend earned a supporter badge'
    : 'When a friend makes their first gift, you both earn a supporter badge';
}
