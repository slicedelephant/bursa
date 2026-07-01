import { CurrencyCode } from '../../core/models';
import { formatMinor, currencyDecimals } from './currency-format';

/**
 * E20 — pure FX-display helpers for the donate flow. Shows what the donor pays vs what the
 * SCHOOL receives at the locked rate. No I/O; returns new values, never mutates inputs.
 * The money is display-only here; the backend does the authoritative minor-unit conversion.
 */

/** Convert a deposit minor amount to the payout currency at a locked rate (display only). */
export function displayPayoutMinor(
  depositMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  lockedRate: number,
): number {
  if (from === to) {
    return depositMinor;
  }
  const fromDecimals = currencyDecimals(from);
  const toDecimals = currencyDecimals(to);
  const scale = Math.pow(10, toDecimals) / Math.pow(10, fromDecimals);
  return Math.round(depositMinor * lockedRate * scale);
}

/** "You pay $50.00 → School receives KSh 6,475.00" style summary. */
export function fxSummary(
  depositMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  lockedRate: number,
): string {
  const paid = formatMinor(depositMinor, from);
  const received = formatMinor(displayPayoutMinor(depositMinor, from, to, lockedRate), to);
  return `You pay ${paid} → School receives ${received}`;
}

/** A human-readable locked-rate line, e.g. "1 USD = 129.5 KES (locked)". */
export function rateLine(from: CurrencyCode, to: CurrencyCode, lockedRate: number): string {
  if (from === to) {
    return `Same currency (${from}) — no conversion`;
  }
  return `1 ${from} = ${lockedRate} ${to} (locked)`;
}
