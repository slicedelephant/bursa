/**
 * E20 — pure currency registry. The single source of truth for the currencies the
 * prototype supports, with their minor-unit `decimals`, `symbol` and `name`. No I/O,
 * no mutation; every getter returns a fresh object. The Prisma `Currency` enum only
 * constrains the codes — the display metadata lives here.
 *
 * Money is always stored as integer minor units; `decimals` tells a converter how many
 * minor units make one major unit (2 for EUR/KES/…; the field exists so 0-decimal
 * currencies stay correct later without a code change).
 */

import { DomainException } from '../common/domain.exception';

export type CurrencyCode =
  | 'EUR'
  | 'USD'
  | 'KES'
  | 'NGN'
  | 'GHS'
  | 'BDT'
  | 'PHP'
  | 'VND';

export interface CurrencyInfo {
  readonly code: CurrencyCode;
  readonly decimals: number;
  readonly symbol: string;
  readonly name: string;
}

const REGISTRY: Readonly<Record<CurrencyCode, CurrencyInfo>> = {
  EUR: { code: 'EUR', decimals: 2, symbol: '€', name: 'Euro' },
  USD: { code: 'USD', decimals: 2, symbol: '$', name: 'US Dollar' },
  KES: { code: 'KES', decimals: 2, symbol: 'KSh', name: 'Kenyan Shilling' },
  NGN: { code: 'NGN', decimals: 2, symbol: '₦', name: 'Nigerian Naira' },
  GHS: { code: 'GHS', decimals: 2, symbol: 'GH₵', name: 'Ghanaian Cedi' },
  BDT: { code: 'BDT', decimals: 2, symbol: '৳', name: 'Bangladeshi Taka' },
  PHP: { code: 'PHP', decimals: 2, symbol: '₱', name: 'Philippine Peso' },
  VND: { code: 'VND', decimals: 2, symbol: '₫', name: 'Vietnamese Dong' },
};

/** True when `code` is a supported currency. */
export function isCurrencyCode(code: string): code is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(REGISTRY, code);
}

/** Returns the currency info for a code, or undefined when unknown. */
export function getCurrency(code: string): CurrencyInfo | undefined {
  return isCurrencyCode(code) ? REGISTRY[code] : undefined;
}

/** Returns the currency info for a code, or throws at the boundary when unknown. */
export function assertCurrency(code: string): CurrencyInfo {
  const info = getCurrency(code);
  if (!info) {
    throw new DomainException(
      'UNKNOWN_CURRENCY',
      `Unsupported currency: ${code}`,
      400,
    );
  }
  return info;
}

/** All supported currencies as a fresh, code-sorted list. */
export function listCurrencies(): CurrencyInfo[] {
  return Object.values(REGISTRY)
    .map((c) => ({ ...c }))
    .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}
