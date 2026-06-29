/**
 * E9 Trust-and-Safety — pure campaign-moderation rules.
 *
 * `evaluateCampaign` derives an auto-flag risk score from suspicious keywords,
 * sanctioned geography, near-duplicate campaigns and open community flags.
 * `decideModeration` is the OPEN → APPROVE/REJECT/ESCALATE transition. Both are
 * deterministic and pure (no I/O, no mutation).
 */

import { clampScore, RiskLevel, scoreToLevel } from './fraud-score';
import {
  duplicateScore,
  isSanctionedCountry,
  matchSuspiciousKeywords,
} from './ofac-keyword-matcher';

/** A campaign is auto-flagged once its moderation risk score reaches this. */
export const AUTO_FLAG_THRESHOLD = 40;
/** Token similarity above this marks a near-duplicate campaign. */
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;

export interface ModerationCandidate {
  readonly title: string;
  readonly story: string;
}

export interface ModerationInput {
  readonly title: string;
  readonly story: string;
  readonly country?: string | null;
  readonly openFlagCount?: number;
  /** Existing campaigns to compare for duplication (same school/program). */
  readonly others?: readonly ModerationCandidate[];
}

export interface ModerationEvaluation {
  readonly riskScore: number;
  readonly riskLevel: RiskLevel;
  readonly reasons: string[];
  readonly autoFlagged: boolean;
}

export function evaluateCampaign(input: ModerationInput): ModerationEvaluation {
  const reasons: string[] = [];
  let raw = 0;

  const text = `${input.title} ${input.story}`;
  const keywords = matchSuspiciousKeywords(text);
  if (keywords.count > 0) {
    raw += Math.min(keywords.count * 15, 45);
    for (const kw of keywords.matched) reasons.push(`suspicious_keyword:${kw}`);
  }

  if (isSanctionedCountry(input.country)) {
    raw += 50;
    reasons.push(`sanctioned_country:${input.country?.trim().toUpperCase()}`);
  }

  const others = input.others ?? [];
  const bestDuplicate = others.reduce(
    (best, other) =>
      Math.max(best, duplicateScore(text, `${other.title} ${other.story}`)),
    0,
  );
  if (bestDuplicate >= DUPLICATE_SIMILARITY_THRESHOLD) {
    raw += 40;
    reasons.push(`duplicate_campaign:${bestDuplicate.toFixed(2)}`);
  }

  const flags = input.openFlagCount ?? 0;
  if (flags > 0) {
    raw += Math.min(flags * 10, 30);
    reasons.push(`community_flags:${flags}`);
  }

  const riskScore = clampScore(raw);
  return {
    riskScore,
    riskLevel: scoreToLevel(riskScore),
    reasons,
    autoFlagged: riskScore >= AUTO_FLAG_THRESHOLD,
  };
}

export type ModerationAction = 'APPROVE' | 'REJECT' | 'ESCALATE';
export type ModerationStatusValue =
  | 'OPEN'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED';

export interface ModerationDecision {
  readonly status: ModerationStatusValue;
  readonly freezeCampaign: boolean;
}

const ACTION_TO_STATUS: Record<ModerationAction, ModerationStatusValue> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  ESCALATE: 'ESCALATED',
};

/**
 * Applies an operator action to an OPEN case. Only OPEN cases can transition;
 * anything else throws `INVALID_TRANSITION` (mapped to 409 by the service).
 * REJECT additionally signals the campaign should be frozen.
 */
export function decideModeration(
  current: ModerationStatusValue,
  action: ModerationAction,
): ModerationDecision {
  if (current !== 'OPEN') {
    throw new Error('INVALID_TRANSITION');
  }
  const status = ACTION_TO_STATUS[action];
  return { status, freezeCampaign: action === 'REJECT' };
}
