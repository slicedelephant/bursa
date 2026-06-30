import { DataQualityField } from '../../core/models';

/**
 * Pure presentation helpers for the data-quality (completeness) panel. No I/O;
 * returns new values, never mutates inputs.
 */

const FIELD_LABELS: Record<string, string> = {
  gender: 'Gender',
  birthYear: 'Age',
  country: 'Country',
  firstGen: 'First-generation',
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/** A Tailwind colour class for a completeness percentage. */
export function completenessClass(pct: number): string {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-brand-orange';
}

/** Bar width (clamped 0–100) for a percentage. */
export function barWidth(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  return `${clamped}%`;
}

/** A human "collect more" hint for a field below target. */
export function collectMoreHint(field: DataQualityField): string | null {
  if (!field.collectMore) return null;
  return `Only ${field.pct}% captured — collect more ${fieldLabel(
    field.field,
  ).toLowerCase()} data.`;
}
