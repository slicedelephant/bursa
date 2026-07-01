import { CurrencyCode } from '../../core/models';

/**
 * E20 — pure currency presentation helpers for the localized donate flow. Money is
 * integer minor units; these format for display without storing a float. No I/O; returns
 * new values, never mutates inputs. Mirrors the backend `fx/currency.ts` registry.
 */

interface CurrencyMeta {
  decimals: number;
  symbol: string;
}

const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  EUR: { decimals: 2, symbol: '€' },
  USD: { decimals: 2, symbol: '$' },
  KES: { decimals: 2, symbol: 'KSh' },
  NGN: { decimals: 2, symbol: '₦' },
  GHS: { decimals: 2, symbol: 'GH₵' },
  BDT: { decimals: 2, symbol: '৳' },
  PHP: { decimals: 2, symbol: '₱' },
  VND: { decimals: 2, symbol: '₫' },
};

/** The number of decimals for a currency (defaults to 2 for an unknown code). */
export function currencyDecimals(code: CurrencyCode): number {
  return CURRENCY_META[code]?.decimals ?? 2;
}

/** The display symbol for a currency (defaults to the code for an unknown one). */
export function currencySymbol(code: CurrencyCode): string {
  return CURRENCY_META[code]?.symbol ?? code;
}

/** Format an integer minor-unit amount for a currency, e.g. 6475 KES -> "KSh 64.75". */
export function formatMinor(amountMinor: number, code: CurrencyCode): string {
  const decimals = currencyDecimals(code);
  const major = (amountMinor / Math.pow(10, decimals)).toFixed(decimals);
  return `${currencySymbol(code)} ${major}`;
}

/** Convert a major-unit input (e.g. "12.34") to integer minor units for a currency. */
export function toMinor(amountMajor: number, code: CurrencyCode): number {
  const decimals = currencyDecimals(code);
  return Math.round(amountMajor * Math.pow(10, decimals));
}
