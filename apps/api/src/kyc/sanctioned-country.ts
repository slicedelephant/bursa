/**
 * E11 KYC — pure sanctioned / elevated-risk country matcher.
 *
 * The hard sanction list is the SAME static E9 list (`SANCTIONED_COUNTRIES`) —
 * a single source of truth, NOT a live OFAC/EU/UN sanctions feed (see spec
 * Out-of-Scope). On top of it this module adds a small "grey" list of elevated-
 * risk countries that route an AML check to manual review rather than a hard
 * block. No I/O, no mutation.
 */

import {
  SANCTIONED_COUNTRIES,
  isSanctionedCountry,
} from '../trust-safety/ofac-keyword-matcher';

// Re-export so KYC consumers depend on this module, not two different lists.
export { SANCTIONED_COUNTRIES, isSanctionedCountry };

/**
 * Static, illustrative "grey" list (ISO alpha-2): not sanctioned, but elevated
 * AML risk → manual review. Deliberately small and demonstrative.
 */
export const ELEVATED_RISK_COUNTRIES: readonly string[] = [
  'NG', // Nigeria
  'PK', // Pakistan
  'AF', // Afghanistan
  'YE', // Yemen
  'SO', // Somalia
];

/** Normalize a country code to upper-case ISO alpha-2 (trimmed). */
export function normalizeCountry(country?: string | null): string {
  return (country ?? '').trim().toUpperCase();
}

/** True if `country` is on the elevated-risk (grey) list. */
export function isElevatedRiskCountry(country?: string | null): boolean {
  const code = normalizeCountry(country);
  return code.length > 0 && ELEVATED_RISK_COUNTRIES.includes(code);
}

export type CountryRisk = 'CLEAR' | 'ELEVATED' | 'SANCTIONED';

/**
 * Classify a country into one of three AML-relevant buckets. Sanctioned wins
 * over elevated; an unknown/blank country is CLEAR (no hit).
 */
export function classifyCountryRisk(country?: string | null): CountryRisk {
  if (isSanctionedCountry(country)) return 'SANCTIONED';
  if (isElevatedRiskCountry(country)) return 'ELEVATED';
  return 'CLEAR';
}
