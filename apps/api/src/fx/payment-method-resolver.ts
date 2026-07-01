/**
 * E20 — pure payment-method-per-country resolver. Maps an ISO-2 country to the local
 * donor-deposit methods available there, always with CARD as a global fallback. These
 * methods are donor-side only; money still flows to the school. Deterministic registry,
 * no I/O, no mutation — returns a fresh array.
 */

import { LocalPaymentMethod } from '@prisma/client';

/** Local (non-card) methods available per country. Order is display priority. */
const COUNTRY_METHODS: Readonly<Record<string, readonly LocalPaymentMethod[]>> =
  {
    KE: ['MPESA', 'LOCAL_BANK_TRANSFER'],
    NG: ['MOBILE_MONEY', 'LOCAL_BANK_TRANSFER'],
    GH: ['MOBILE_MONEY', 'LOCAL_BANK_TRANSFER'],
    PH: ['GCASH', 'LOCAL_BANK_TRANSFER'],
    BD: ['BKASH', 'LOCAL_BANK_TRANSFER'],
    VN: ['LOCAL_BANK_TRANSFER'],
  };

export interface CountryMethods {
  readonly country: string;
  readonly methods: readonly LocalPaymentMethod[];
}

/**
 * Resolve the deposit methods for a country: its local methods first (if any), then
 * CARD as the always-available global fallback. Unknown countries get CARD only.
 */
export function resolvePaymentMethods(country: string): CountryMethods {
  const code = country.toUpperCase();
  const local = COUNTRY_METHODS[code] ?? [];
  const methods: LocalPaymentMethod[] = [...local, 'CARD'];
  return { country: code, methods };
}

/** True when `method` is available for the given country. */
export function isMethodAvailable(
  country: string,
  method: LocalPaymentMethod,
): boolean {
  return resolvePaymentMethods(country).methods.includes(method);
}
