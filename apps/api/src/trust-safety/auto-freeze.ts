/**
 * E9 Trust-and-Safety — pure auto-freeze decision logic.
 *
 * A freeze only sets status flags; it never touches the money path
 * (Constitution III). Thresholds:
 *   - campaign: 3+ chargebacks
 *   - donor:    2+ failed transactions AND at least one chargeback (pattern)
 * Pure, deterministic, no I/O.
 */

export const CAMPAIGN_CHARGEBACK_FREEZE_THRESHOLD = 3;
export const DONOR_FAILED_FREEZE_THRESHOLD = 2;

export interface FreezeDecision {
  readonly freeze: boolean;
  readonly reason?: string;
}

/** Freeze a campaign once it accumulates 3 or more chargebacks. */
export function decideCampaignFreeze(chargebackCount: number): FreezeDecision {
  if (chargebackCount >= CAMPAIGN_CHARGEBACK_FREEZE_THRESHOLD) {
    return {
      freeze: true,
      reason: `chargeback_threshold:${chargebackCount}`,
    };
  }
  return { freeze: false };
}

export interface DonorFreezeInput {
  readonly failedCount: number;
  readonly chargebackCount: number;
}

/**
 * Freeze a donor account on a fraud pattern: 2+ failed transactions combined
 * with at least one chargeback.
 */
export function decideDonorFreeze(input: DonorFreezeInput): FreezeDecision {
  const hasFailedPattern = input.failedCount >= DONOR_FAILED_FREEZE_THRESHOLD;
  const hasChargeback = input.chargebackCount >= 1;
  if (hasFailedPattern && hasChargeback) {
    return {
      freeze: true,
      reason: `failed_chargeback_pattern:${input.failedCount}/${input.chargebackCount}`,
    };
  }
  return { freeze: false };
}
