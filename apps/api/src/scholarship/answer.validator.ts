/**
 * E19 — Scholarship Program Manager: pure answer validator.
 *
 * Validates submitted answers against the form schema and the computed
 * visibility map. Hidden fields are skipped (never counted as a required-field
 * violation). Deterministic, no I/O; returns new objects, never mutates inputs.
 */

import { AnswerSet, VisibilityMap } from './conditional-logic';
import { FormFieldSpec } from './form-schema.validator';

export interface AnswerValidationInput {
  readonly fields: readonly FormFieldSpec[];
  readonly answers: AnswerSet;
  readonly visibility: VisibilityMap;
}

export interface AnswerValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

function typeError(field: FormFieldSpec, value: string): string | null {
  switch (field.type) {
    case 'NUMBER':
      return Number.isFinite(Number(value)) ? null : `${field.fieldKey} must be a number`;
    case 'BOOLEAN':
      return value === 'true' || value === 'false'
        ? null
        : `${field.fieldKey} must be true or false`;
    case 'EMAIL':
      return EMAIL_PATTERN.test(value) ? null : `${field.fieldKey} must be a valid email`;
    case 'SELECT':
      return (field.options ?? []).includes(value)
        ? null
        : `${field.fieldKey} must be one of the allowed options`;
    default:
      return null;
  }
}

/** Validates required + typed answers, skipping fields hidden by conditional logic. */
export function validateAnswers(input: AnswerValidationInput): AnswerValidation {
  const errors: string[] = [];

  for (const field of input.fields) {
    if (input.visibility[field.fieldKey] === false) {
      continue;
    }
    const value = input.answers[field.fieldKey];

    if (isBlank(value)) {
      if (field.required) {
        errors.push(`${field.fieldKey} is required`);
      }
      continue;
    }

    const err = typeError(field, value as string);
    if (err) {
      errors.push(err);
    }
  }

  return { valid: errors.length === 0, errors };
}
