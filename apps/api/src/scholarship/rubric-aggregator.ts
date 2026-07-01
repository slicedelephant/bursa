/**
 * E19 — Scholarship Program Manager: pure rubric aggregator.
 *
 * Turns per-reviewer, per-field scores (0-5) into a weighted consensus score
 * for an application, normalized to 0-100. Reviewers who have not scored a field
 * simply do not count toward its mean (no null bias). Deterministic, no I/O;
 * returns new objects, never mutates inputs.
 */

export interface RubricField {
  readonly fieldKey: string;
  readonly rubricWeight: number;
}

export interface RubricScore {
  readonly fieldKey: string;
  readonly score: number; // 0-5
}

export interface RubricInput {
  readonly fields: readonly RubricField[];
  readonly scores: readonly RubricScore[];
}

export interface PerFieldAverage {
  readonly fieldKey: string;
  readonly average: number;
  readonly count: number;
}

export interface RubricResult {
  readonly perField: readonly PerFieldAverage[];
  readonly consensus: number; // 0-100
}

const MAX_SCORE = 5;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Weighted mean of per-field reviewer averages, normalized to a 0-100 consensus. */
export function aggregateRubric(input: RubricInput): RubricResult {
  const weighted = input.fields.filter((f) => f.rubricWeight > 0);

  const perField: PerFieldAverage[] = weighted.map((field) => {
    const fieldScores = input.scores.filter((s) => s.fieldKey === field.fieldKey);
    const count = fieldScores.length;
    const average =
      count === 0 ? 0 : round1(fieldScores.reduce((sum, s) => sum + s.score, 0) / count);
    return { fieldKey: field.fieldKey, average, count };
  });

  const totalWeight = weighted.reduce((sum, f) => sum + f.rubricWeight, 0);

  if (totalWeight === 0) {
    return { perField, consensus: 0 };
  }

  const weightedSum = weighted.reduce((sum, field) => {
    const avg = perField.find((p) => p.fieldKey === field.fieldKey)?.average ?? 0;
    return sum + avg * field.rubricWeight;
  }, 0);

  const consensus = Math.round((weightedSum / totalWeight / MAX_SCORE) * 100);
  return { perField, consensus };
}
