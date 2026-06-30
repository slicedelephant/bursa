/**
 * E11 KYC — pure liveness-result evaluator.
 *
 * The identity provider only supplies a raw confidence (0-100). This pure core
 * decides pass/fail against a fixed threshold. No I/O, no mutation — so the
 * whole evaluation is fully unit-testable and deterministic.
 */

/** Minimum confidence (inclusive) for a liveness check to count as passed. */
export const LIVENESS_MIN_CONFIDENCE = 70;

export interface LivenessEvaluation {
  readonly confidence: number;
  readonly passed: boolean;
}

/** Clamp any number into the inclusive 0-100 confidence range (NaN → 0). */
export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

/**
 * Evaluate a raw liveness confidence into a pass/fail decision. A confidence at
 * or above `LIVENESS_MIN_CONFIDENCE` passes; everything else fails.
 */
export function evaluateLiveness(rawConfidence: number): LivenessEvaluation {
  const confidence = clampConfidence(rawConfidence);
  return { confidence, passed: confidence >= LIVENESS_MIN_CONFIDENCE };
}
