/**
 * E19 — Scholarship Program Manager: pure conditional-visibility evaluator.
 *
 * Given the form fields and a set of answers, decides which fields are visible.
 * A field with an unmet `showIf` rule is hidden. Deterministic, no I/O; returns
 * a new map, never mutates inputs.
 */

import { FormFieldSpec } from './form-schema.validator';

export type VisibilityMap = Record<string, boolean>;

export interface AnswerSet {
  readonly [fieldKey: string]: string | undefined;
}

/**
 * Returns a map fieldKey -> visible. A field is visible when it has no showIf
 * rule, or when the referenced field's answer equals the required value. Missing
 * dependency answers make the field hidden.
 */
export function evaluateVisibility(
  fields: readonly FormFieldSpec[],
  answers: AnswerSet,
): VisibilityMap {
  const map: VisibilityMap = {};
  for (const field of fields) {
    if (field.showIfFieldId == null) {
      map[field.fieldKey] = true;
      continue;
    }
    const actual = answers[field.showIfFieldId];
    map[field.fieldKey] = actual !== undefined && actual === field.showIfValue;
  }
  return map;
}
