/**
 * E11 KYC — pure AML decision.
 *
 * Decides CLEAR / HIT / BLOCKED for a sponsor contribution from three inputs:
 * the amount (only screened above a threshold), the contribution country
 * (sanctioned → hard BLOCK, elevated → HIT) and an optional provider watchlist
 * hit. No I/O, no mutation — the provider call stays thin; this is the testable
 * core. The sanctioned/grey lists come from `sanctioned-country.ts`.
 */

import { AmlDecision } from '@prisma/client';
import { classifyCountryRisk } from './sanctioned-country';

/** AML is only screened for sponsor contributions strictly above this amount. */
export const AML_THRESHOLD_CENTS = 500_000; // 5,000 EUR / month

export interface AmlDecisionInput {
  readonly amountCents: number;
  readonly country?: string | null;
  /** Provider-reported watchlist/PEP hit (mock or real). */
  readonly providerHit?: boolean;
}

export interface AmlDecisionResult {
  readonly decision: AmlDecision;
  readonly screened: boolean;
  readonly reasons: string[];
}

/** True if the amount is strictly above the AML screening threshold. */
export function requiresAmlScreening(amountCents: number): boolean {
  return Number.isFinite(amountCents) && amountCents > AML_THRESHOLD_CENTS;
}

/**
 * Decide the AML outcome. Below the threshold the contribution is CLEAR and not
 * screened at all (no provider call). Above it: a sanctioned country is a hard
 * BLOCK; an elevated-risk country or a provider hit is a HIT (manual review);
 * otherwise CLEAR.
 */
export function decideAml(input: AmlDecisionInput): AmlDecisionResult {
  if (!requiresAmlScreening(input.amountCents)) {
    return {
      decision: AmlDecision.CLEAR,
      screened: false,
      reasons: ['Below AML screening threshold'],
    };
  }

  const reasons: string[] = [];
  const countryRisk = classifyCountryRisk(input.country);

  if (countryRisk === 'SANCTIONED') {
    reasons.push('Contribution from a sanctioned country');
    return { decision: AmlDecision.BLOCKED, screened: true, reasons };
  }

  if (countryRisk === 'ELEVATED') {
    reasons.push('Contribution from an elevated-risk country');
  }
  if (input.providerHit) {
    reasons.push('Provider watchlist match');
  }

  const decision = reasons.length > 0 ? AmlDecision.HIT : AmlDecision.CLEAR;
  if (decision === AmlDecision.CLEAR) {
    reasons.push('No AML signals above threshold');
  }
  return { decision, screened: true, reasons };
}
