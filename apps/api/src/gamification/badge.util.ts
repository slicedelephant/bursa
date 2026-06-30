/**
 * Pure tier/badge resolver — a generic gamification primitive. Maps a numeric value
 * (e.g. streak months, referral count, group total) onto an ordered set of tier
 * thresholds and reports the next tier plus the distance to it (a motivational nudge).
 * No I/O; returns new values; never mutates inputs. Reused by E16 (giving streak),
 * and designed for E15 (referrals) and E18 (groups).
 */

export type Tier = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';

export interface TierThreshold {
  readonly tier: Tier;
  readonly min: number;
}

export interface TierResult {
  readonly tier: Tier;
  readonly nextTier: Tier | null;
  readonly amountToNext: number | null;
}

export interface BadgeProgress {
  readonly tier: Tier;
  readonly streakMonths: number;
  readonly nextTier: Tier | null;
  readonly monthsToNextTier: number | null;
}

/** Bronze/Silver/Gold at 3/6/12 — the E16 monthly-giving thresholds. */
export const MONTHLY_GIVING_THRESHOLDS: readonly TierThreshold[] = [
  { tier: 'BRONZE', min: 3 },
  { tier: 'SILVER', min: 6 },
  { tier: 'GOLD', min: 12 },
];

export function resolveTier(
  value: number,
  thresholds: readonly TierThreshold[],
): TierResult {
  const ordered = [...thresholds].sort((a, b) => a.min - b.min);

  let current: Tier = 'NONE';
  let next: TierThreshold | null = ordered[0] ?? null;

  for (const threshold of ordered) {
    if (value >= threshold.min) {
      current = threshold.tier;
      next = null;
    } else {
      next = threshold;
      break;
    }
  }

  return {
    tier: current,
    nextTier: next ? next.tier : null,
    amountToNext: next ? Math.max(0, next.min - value) : null,
  };
}

export function monthlyGivingBadge(streakMonths: number): BadgeProgress {
  const result = resolveTier(streakMonths, MONTHLY_GIVING_THRESHOLDS);
  return {
    tier: result.tier,
    streakMonths,
    nextTier: result.nextTier,
    monthsToNextTier: result.amountToNext,
  };
}
