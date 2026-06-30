/**
 * E13 Employer-Matching — pure eligibility evaluator.
 *
 * Given an employer program (from the provider) and a donation amount, decides
 * whether the donor is eligible to claim a match. No I/O, no mutation.
 */

/** The shape a match provider returns for a domain (mock or real). */
export interface MatchProgram {
  readonly domain: string;
  readonly employerName: string;
  /** ×100: 100 = 1:1, 200 = 2:1. */
  readonly matchRatio: number;
  readonly annualCapCents: number;
  readonly minDonationCents: number;
  readonly integrationLevel: 'AUTO_SUBMIT' | 'PORTAL' | 'MANUAL';
  readonly applyUrlTemplate?: string | null;
  readonly active: boolean;
}

export type IneligibleReason = 'NO_PROGRAM' | 'INACTIVE' | 'BELOW_MIN_DONATION';

export interface EligibilityResult {
  readonly eligible: boolean;
  readonly program?: MatchProgram;
  readonly reason?: IneligibleReason;
}

/**
 * Evaluate whether a donation qualifies for an employer match. The program must
 * exist, be active, and the donation must meet the program's minimum.
 */
export function evaluateEligibility(
  program: MatchProgram | null | undefined,
  donationCents: number,
): EligibilityResult {
  if (!program) return { eligible: false, reason: 'NO_PROGRAM' };
  if (!program.active) return { eligible: false, reason: 'INACTIVE', program };
  if (donationCents < program.minDonationCents) {
    return { eligible: false, reason: 'BELOW_MIN_DONATION', program };
  }
  return { eligible: true, program };
}
