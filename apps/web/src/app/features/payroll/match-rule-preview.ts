/**
 * E21 — pure preview of a firm-wide match rule for the config UI. Mirrors the
 * backend E13 `computeMatch` (ratio ×100, capped by the per-employee balance) so
 * the admin sees the effect before saving. No I/O; integer minor units.
 */

/** Scale of the match ratio: 100 = 1:1, 200 = 2:1. */
export const MATCH_RATIO_SCALE = 100;

export interface RulePreview {
  /** The match for the sample contribution, capped at the per-employee cap. */
  readonly matchCents: number;
  readonly capped: boolean;
  /** Human ratio string, e.g. "1:1" or "2:1". */
  readonly ratioLabel: string;
}

/** Format a ×100 ratio as "N:1" (1 decimal only when needed). */
export function ratioLabel(matchRatio: number): string {
  const ratio = Math.max(0, matchRatio) / MATCH_RATIO_SCALE;
  const rounded = Number.isInteger(ratio) ? ratio.toString() : ratio.toFixed(1);
  return `${rounded}:1`;
}

/**
 * Preview a rule against a sample contribution. The match is floored to whole
 * cents (mirroring the backend) and capped at the per-employee cap.
 */
export function previewRule(input: {
  contributionCents: number;
  matchRatio: number;
  perEmployeeCapCents: number;
}): RulePreview {
  const contribution = Math.max(0, Math.floor(input.contributionCents));
  const cap = Math.max(0, Math.floor(input.perEmployeeCapCents));
  const uncapped = Math.floor((contribution * Math.max(0, input.matchRatio)) / MATCH_RATIO_SCALE);
  const matchCents = Math.min(uncapped, cap);
  return {
    matchCents,
    capped: matchCents < uncapped,
    ratioLabel: ratioLabel(input.matchRatio),
  };
}
