/**
 * E19 — Scholarship Program Manager: pure form-schema validator.
 *
 * Guards a schema-driven application form (no drag-drop WYSIWYG). Deterministic,
 * no I/O; returns new objects, never mutates inputs.
 */

export type FieldType =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'SELECT'
  | 'BOOLEAN'
  | 'EMAIL';

export interface FormFieldSpec {
  readonly fieldKey: string;
  readonly label: string;
  readonly type: FieldType;
  readonly required?: boolean;
  readonly options?: readonly string[];
  readonly rubricWeight?: number;
  readonly showIfFieldId?: string | null;
  readonly showIfValue?: string | null;
}

export interface FormSchemaValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Validates a form schema: non-empty, unique field keys, SELECT fields carry
 * options, rubric weights are non-negative, and conditional references point at
 * an existing field key.
 */
export function validateFormSchema(
  fields: readonly FormFieldSpec[],
): FormSchemaValidation {
  const errors: string[] = [];

  if (fields.length === 0) {
    errors.push('Form must have at least one field');
  }

  const seen = new Set<string>();
  const keys = new Set(fields.map((f) => f.fieldKey));

  for (const field of fields) {
    if (!KEY_PATTERN.test(field.fieldKey)) {
      errors.push(`Invalid field key: ${field.fieldKey || '(empty)'}`);
    }
    if (seen.has(field.fieldKey)) {
      errors.push(`Duplicate field key: ${field.fieldKey}`);
    }
    seen.add(field.fieldKey);

    if (!field.label || field.label.trim() === '') {
      errors.push(`Field ${field.fieldKey} is missing a label`);
    }

    if (field.type === 'SELECT' && (field.options?.length ?? 0) === 0) {
      errors.push(`SELECT field ${field.fieldKey} needs at least one option`);
    }

    if ((field.rubricWeight ?? 0) < 0) {
      errors.push(`Field ${field.fieldKey} has a negative rubric weight`);
    }

    if (field.showIfFieldId != null) {
      if (!keys.has(field.showIfFieldId)) {
        errors.push(
          `Field ${field.fieldKey} references unknown showIf field ${field.showIfFieldId}`,
        );
      }
      if (field.showIfFieldId === field.fieldKey) {
        errors.push(`Field ${field.fieldKey} cannot depend on itself`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
