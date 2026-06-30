/**
 * E11 KYC — pure student risk scorer.
 *
 * Aggregates three signals into a single 0-100 risk score plus a risk band:
 *  - geographic risk (sanctioned / elevated-risk country of the student)
 *  - income verification (an optional, declared step; unverified raises risk)
 *  - school accreditation (an unaccredited school raises risk)
 *
 * Mirrors the E9 `fraud-score.ts` shape (clamp + band thresholds + reason merge)
 * and reuses the same `RiskLevel` enum. Deterministic, no I/O, no mutation.
 */

import { RiskLevel } from '@prisma/client';
import { classifyCountryRisk } from './sanctioned-country';

export interface RiskInput {
  readonly country?: string | null;
  /** Whether the optional income-verification step was completed and passed. */
  readonly incomeVerified?: boolean;
  /** Whether the student's school is accredited (E8 partner schools are). */
  readonly schoolAccredited?: boolean;
}

export interface RiskScore {
  readonly score: number;
  readonly level: RiskLevel;
  readonly reasons: string[];
}

const GEO_SANCTIONED_WEIGHT = 60;
const GEO_ELEVATED_WEIGHT = 30;
const INCOME_UNVERIFIED_WEIGHT = 20;
const SCHOOL_UNACCREDITED_WEIGHT = 25;

/** Clamp any number into the inclusive 0-100 score range (NaN → 0). */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/** Map a 0-100 score onto a risk band (same thresholds as the E9 fraud band). */
export function scoreToLevel(score: number): RiskLevel {
  const s = clampScore(score);
  if (s >= 75) return RiskLevel.CRITICAL;
  if (s >= 50) return RiskLevel.HIGH;
  if (s >= 25) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

/**
 * Compute a student's KYC risk score. A clean profile (clear country, income
 * verified, accredited school) scores 0 / LOW.
 */
export function scoreStudentRisk(input: RiskInput): RiskScore {
  const reasons: string[] = [];
  let total = 0;

  const geo = classifyCountryRisk(input.country);
  if (geo === 'SANCTIONED') {
    total += GEO_SANCTIONED_WEIGHT;
    reasons.push('Sanctioned country of residence');
  } else if (geo === 'ELEVATED') {
    total += GEO_ELEVATED_WEIGHT;
    reasons.push('Elevated-risk country of residence');
  }

  if (input.incomeVerified === false) {
    total += INCOME_UNVERIFIED_WEIGHT;
    reasons.push('Income not verified');
  }

  if (input.schoolAccredited === false) {
    total += SCHOOL_UNACCREDITED_WEIGHT;
    reasons.push('School not accredited');
  }

  const score = clampScore(total);
  return { score, level: scoreToLevel(score), reasons };
}
