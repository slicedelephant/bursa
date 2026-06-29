/**
 * E9 Trust-and-Safety — pure fraud-score aggregation.
 *
 * Deterministic heuristic, NOT a trained ML model (see spec Out-of-Scope). The
 * sub-detectors (card-testing, donor-risk, velocity) each return a partial
 * {score, reasons}; this core merges them into a single 0-100 score, a derived
 * risk band and a de-duplicated reason list. No I/O, no mutation, no imports —
 * so the whole scoring graph stays acyclic and fully unit-testable.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScoreComponent {
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface FraudScore {
  readonly score: number;
  readonly level: RiskLevel;
  readonly reasons: string[];
}

/** Clamp any number into the inclusive 0-100 score range (NaN → 0). */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/** Map a 0-100 score onto a risk band. */
export function scoreToLevel(score: number): RiskLevel {
  const s = clampScore(score);
  if (s >= 75) return 'CRITICAL';
  if (s >= 50) return 'HIGH';
  if (s >= 25) return 'MEDIUM';
  return 'LOW';
}

/**
 * Aggregate partial score components into a final fraud score. Scores are
 * summed (then clamped) and reasons merged preserving first-seen order without
 * duplicates.
 */
export function aggregateFraudScore(
  components: readonly ScoreComponent[],
): FraudScore {
  const total = components.reduce((sum, c) => sum + (c.score || 0), 0);
  const reasons: string[] = [];
  for (const component of components) {
    for (const reason of component.reasons) {
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }
  const score = clampScore(total);
  return { score, level: scoreToLevel(score), reasons };
}
