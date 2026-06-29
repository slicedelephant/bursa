/**
 * E9 Trust-and-Safety — pure donor-risk scorer.
 *
 * Combines geography, transaction size, velocity, card-type and recent failures
 * into a 0-100 donor-risk score with a derived band and explicit reasons.
 * Deterministic heuristic, NOT ML. No I/O, no mutation.
 */

import { clampScore, RiskLevel, scoreToLevel } from './fraud-score';
import { isSanctionedCountry } from './ofac-keyword-matcher';

/** Donations at or above this amount (in cents) are auto-flagged: 5,000 EUR. */
export const HIGH_VALUE_CENTS = 500_000;
/** More donations than this in the velocity window contributes risk. */
export const VELOCITY_LIMIT = 5;
/** Auto-flag threshold for the overall donor-risk score. */
export const AUTO_FLAG_THRESHOLD = 50;

export interface DonorRiskInput {
  readonly country?: string | null;
  readonly amountCents: number;
  /** Donations by this donor inside the velocity window (e.g. last hour). */
  readonly recentDonationCount?: number;
  readonly cardType?: string | null;
  /** Recent failed transactions by this donor. */
  readonly failedRecentCount?: number;
}

export interface DonorRiskResult {
  readonly score: number;
  readonly level: RiskLevel;
  readonly reasons: string[];
  readonly autoFlagged: boolean;
}

export function scoreDonorRisk(input: DonorRiskInput): DonorRiskResult {
  const reasons: string[] = [];
  let raw = 0;

  if (isSanctionedCountry(input.country)) {
    raw += 30;
    reasons.push(`sanctioned_geography:${input.country?.trim().toUpperCase()}`);
  }

  if (input.amountCents >= HIGH_VALUE_CENTS) {
    raw += 40;
    reasons.push('high_value');
  }

  const recent = input.recentDonationCount ?? 0;
  if (recent > VELOCITY_LIMIT) {
    raw += 25;
    reasons.push(`transaction_velocity:${recent}`);
  }

  const cardType = (input.cardType ?? '').toUpperCase();
  if (cardType === 'PREPAID') {
    raw += 15;
    reasons.push('prepaid_card');
  }

  const failed = input.failedRecentCount ?? 0;
  if (failed >= 2) {
    raw += 20;
    reasons.push(`recent_failures:${failed}`);
  }

  const score = clampScore(raw);
  const autoFlagged =
    score >= AUTO_FLAG_THRESHOLD || input.amountCents >= HIGH_VALUE_CENTS;
  return { score, level: scoreToLevel(score), reasons, autoFlagged };
}
