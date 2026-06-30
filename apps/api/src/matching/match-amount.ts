/**
 * E13 Employer-Matching — pure match-amount calculator.
 *
 * Computes the employer match for a donation: ratio × donation, hard-capped by
 * the donor's REMAINING annual balance. No I/O, no mutation; never negative,
 * never over the cap.
 */

/** Scale of `matchRatio`: 100 = 1:1, 200 = 2:1. */
export const MATCH_RATIO_SCALE = 100;

export interface MatchComputation {
  /** The committed match in cents (ratio × donation, capped). */
  readonly matchCents: number;
  /** The uncapped match before the annual cap was applied. */
  readonly uncappedMatchCents: number;
  /** Remaining annual balance AFTER this match would be committed. */
  readonly remainingAfterCents: number;
  /** True when the annual cap reduced the match below the uncapped value. */
  readonly capped: boolean;
}

/** Remaining annual match balance for a donor, clamped to >= 0. */
export function remainingAnnualCents(
  annualCapCents: number,
  usedCents: number,
): number {
  return Math.max(0, annualCapCents - Math.max(0, usedCents));
}

/**
 * Compute the match for a donation. `donationCents` is the donor's own gift,
 * `matchRatio` is ×100, and `remainingCents` is the donor's remaining annual
 * balance. The raw match is floored to whole cents, then capped by the remaining
 * balance.
 */
export function computeMatch(
  donationCents: number,
  matchRatio: number,
  remainingCents: number,
): MatchComputation {
  const safeDonation = Math.max(0, Math.floor(donationCents));
  const safeRemaining = Math.max(0, Math.floor(remainingCents));
  const uncappedMatchCents = Math.floor(
    (safeDonation * matchRatio) / MATCH_RATIO_SCALE,
  );
  const matchCents = Math.min(uncappedMatchCents, safeRemaining);

  return {
    matchCents,
    uncappedMatchCents,
    remainingAfterCents: safeRemaining - matchCents,
    capped: matchCents < uncappedMatchCents,
  };
}
