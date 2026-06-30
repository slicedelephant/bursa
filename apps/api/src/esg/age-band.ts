/**
 * E14 ESG/CSRD — pure age-band derivation. Maps an optional birth year to a coarse
 * band for diversity reporting (no exact ages leave aggregation). Null-safe; no I/O,
 * no mutation (Constitution IV).
 */

export type AgeBand = 'UNDER_25' | '25_29' | '30_34' | '35_PLUS' | 'UNKNOWN';

export const AGE_BANDS: readonly AgeBand[] = [
  'UNDER_25',
  '25_29',
  '30_34',
  '35_PLUS',
  'UNKNOWN',
];

const LABELS: Record<AgeBand, string> = {
  UNDER_25: '< 25',
  '25_29': '25–29',
  '30_34': '30–34',
  '35_PLUS': '35+',
  UNKNOWN: 'Unknown',
};

/** Coarse age band from a birth year, relative to a reference year (default now). */
export function ageBand(
  birthYear: number | null | undefined,
  refYear: number = new Date().getFullYear(),
): AgeBand {
  if (
    typeof birthYear !== 'number' ||
    !Number.isFinite(birthYear) ||
    birthYear <= 0 ||
    birthYear > refYear
  ) {
    return 'UNKNOWN';
  }
  const age = refYear - birthYear;
  if (age < 25) return 'UNDER_25';
  if (age < 30) return '25_29';
  if (age < 35) return '30_34';
  return '35_PLUS';
}

/** Human-readable label for a band. */
export function ageBandLabel(band: AgeBand): string {
  return LABELS[band];
}
