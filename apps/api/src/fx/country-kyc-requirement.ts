/**
 * E20 — pure per-country KYC-requirement resolver. Returns the identity document a
 * country requires (e.g. BVN in Nigeria vs passport) plus an AML threshold hint in minor
 * units. This ONLY feeds the existing E11 KYC pipeline — it does not add a new
 * identity/AML provider. Deterministic registry, no I/O, no mutation.
 */

export type KycDocument = 'BVN' | 'NATIONAL_ID' | 'PASSPORT';

export interface KycRequirement {
  readonly country: string;
  readonly document: KycDocument;
  /** Deposits at/above this amount (minor units) get elevated review in the E11 mock. */
  readonly amlThresholdMinor: number;
}

const DEFAULT_THRESHOLD_MINOR = 100000; // 1,000.00 in any 2-decimal currency

const COUNTRY_KYC: Readonly<
  Record<string, { document: KycDocument; amlThresholdMinor: number }>
> = {
  NG: { document: 'BVN', amlThresholdMinor: 50000 },
  KE: { document: 'NATIONAL_ID', amlThresholdMinor: 80000 },
  GH: { document: 'NATIONAL_ID', amlThresholdMinor: 80000 },
  BD: { document: 'NATIONAL_ID', amlThresholdMinor: 60000 },
  PH: { document: 'NATIONAL_ID', amlThresholdMinor: 70000 },
  VN: { document: 'NATIONAL_ID', amlThresholdMinor: 70000 },
};

/**
 * Resolve the KYC requirement for a country. Unknown countries default to PASSPORT with
 * the default AML threshold, so the E11 pipeline always has a requirement to act on.
 */
export function resolveKycRequirement(country: string): KycRequirement {
  const code = country.toUpperCase();
  const entry = COUNTRY_KYC[code];
  if (!entry) {
    return {
      country: code,
      document: 'PASSPORT',
      amlThresholdMinor: DEFAULT_THRESHOLD_MINOR,
    };
  }
  return {
    country: code,
    document: entry.document,
    amlThresholdMinor: entry.amlThresholdMinor,
  };
}

/** True when a deposit amount (minor units) meets or exceeds the country's AML threshold. */
export function requiresEnhancedReview(
  country: string,
  amountMinor: number,
): boolean {
  return amountMinor >= resolveKycRequirement(country).amlThresholdMinor;
}
