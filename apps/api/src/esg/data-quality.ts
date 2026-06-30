/**
 * E14 ESG/CSRD — pure data-quality / completeness scoring. For each optional
 * diversity field, computes captured/total → pct and flags fields below a target
 * threshold for a "collect more" hint. No I/O, no mutation (Constitution IV).
 */

export type DiversityField = 'gender' | 'birthYear' | 'country' | 'firstGen';

export interface CompletenessInput {
  readonly gender?: unknown;
  readonly birthYear?: unknown;
  readonly country?: unknown;
  readonly firstGen?: unknown;
}

export interface FieldCompleteness {
  readonly field: DiversityField;
  readonly captured: number;
  readonly total: number;
  readonly pct: number;
  readonly collectMore: boolean;
}

export interface DataQualityReport {
  readonly fields: readonly FieldCompleteness[];
  readonly overallPct: number;
}

/** Default target below which a field is flagged for "collect more". */
export const DEFAULT_TARGET_PCT = 80;

const FIELDS: readonly DiversityField[] = [
  'gender',
  'birthYear',
  'country',
  'firstGen',
];

function isCaptured(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeDataQuality(
  profiles: ReadonlyArray<CompletenessInput>,
  targetPct: number = DEFAULT_TARGET_PCT,
): DataQualityReport {
  const total = profiles.length;
  const fields = FIELDS.map<FieldCompleteness>((field) => {
    const captured = profiles.filter((p) => isCaptured(p[field])).length;
    const pct = total === 0 ? 0 : round1((captured / total) * 100);
    return { field, captured, total, pct, collectMore: pct < targetPct };
  });
  const overallPct =
    fields.length === 0
      ? 0
      : round1(fields.reduce((sum, f) => sum + f.pct, 0) / fields.length);
  return { fields, overallPct };
}
