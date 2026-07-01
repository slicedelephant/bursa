import { FieldType } from '../../core/models';

/**
 * E19 — pure presentation helpers for the scholarship application builder. No I/O;
 * returns new values, never mutates inputs.
 */

export function fieldTypeLabel(type: FieldType): string {
  switch (type) {
    case 'TEXT':
      return 'Short text';
    case 'LONG_TEXT':
      return 'Long text';
    case 'NUMBER':
      return 'Number';
    case 'SELECT':
      return 'Dropdown';
    case 'BOOLEAN':
      return 'Yes / No';
    case 'EMAIL':
      return 'Email';
    default:
      return type;
  }
}

/** True when the field carries weight in the scoring rubric. */
export function isRubricField(rubricWeight: number): boolean {
  return rubricWeight > 0;
}

/** A human hint describing the conditional rule, or null when unconditional. */
export function conditionHint(
  showIfFieldId: string | null | undefined,
  showIfValue: string | null | undefined,
): string | null {
  if (!showIfFieldId) {
    return null;
  }
  return `Shown when "${showIfFieldId}" is "${showIfValue ?? ''}"`;
}
