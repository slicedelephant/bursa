// Pure referral reward-tier resolver (E15). A thin, semantically-named wrapper over
// the reusable E16 gamification primitive `resolveTier` (badge.util.ts). It maps a
// referral/advocate count onto the E15 thresholds (3/5/10) and attaches the
// recognition perk for each tier. Rewards are FEATURE/RECOGNITION ONLY — never cash
// (compliance: money only ever flows to the school). No I/O; returns new values;
// never mutates inputs.

import { Tier, TierThreshold, resolveTier } from '../gamification/badge.util';

/** What a referrer/advocate unlocks at each tier — recognition, never money. */
export type ReferralPerk = 'NONE' | 'SHOUT_OUT' | 'RECAP' | 'RECOGNITION';

export interface ReferralReward {
  readonly count: number;
  readonly tier: Tier;
  readonly nextTier: Tier | null;
  /** Referrals still needed to reach the next tier, or null at the top tier. */
  readonly toNext: number | null;
  readonly perk: ReferralPerk;
  /** True once at least one referral has converted (the both-win unlock). */
  readonly bothWin: boolean;
}

/** E15 reward thresholds: 3 → shout-out, 5 → recap, 10+ → special recognition. */
export const REFERRAL_REWARD_THRESHOLDS: readonly TierThreshold[] = [
  { tier: 'BRONZE', min: 3 },
  { tier: 'SILVER', min: 5 },
  { tier: 'GOLD', min: 10 },
];

const PERK_BY_TIER: Record<Tier, ReferralPerk> = {
  NONE: 'NONE',
  BRONZE: 'SHOUT_OUT',
  SILVER: 'RECAP',
  GOLD: 'RECOGNITION',
};

export function referralReward(count: number): ReferralReward {
  const safeCount = Math.max(0, Math.floor(count));
  const result = resolveTier(safeCount, REFERRAL_REWARD_THRESHOLDS);
  return {
    count: safeCount,
    tier: result.tier,
    nextTier: result.nextTier,
    toNext: result.amountToNext,
    perk: PERK_BY_TIER[result.tier],
    bothWin: safeCount >= 1,
  };
}
