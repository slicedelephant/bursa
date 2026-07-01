import { PublicFormField } from '../../core/models';

/**
 * E19 — client-side mirror of the backend conditional-logic core. Decides which
 * application-form fields are visible given the current answers, so the public
 * form hides/shows conditional fields without a round-trip. No I/O; returns a new
 * map, never mutates inputs.
 */

export type VisibilityMap = Record<string, boolean>;

export function computeVisibility(
  fields: readonly PublicFormField[],
  answers: Record<string, string>,
): VisibilityMap {
  const map: VisibilityMap = {};
  for (const field of fields) {
    if (!field.showIfFieldId) {
      map[field.fieldKey] = true;
      continue;
    }
    const actual = answers[field.showIfFieldId];
    map[field.fieldKey] = actual !== undefined && actual === field.showIfValue;
  }
  return map;
}

/** The subset of fields currently visible, preserving order. */
export function visibleFields(
  fields: readonly PublicFormField[],
  answers: Record<string, string>,
): PublicFormField[] {
  const map = computeVisibility(fields, answers);
  return fields.filter((f) => map[f.fieldKey] !== false);
}
