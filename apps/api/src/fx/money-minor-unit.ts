/**
 * E20 — pure minor-unit money helpers. Money is ALWAYS integer minor units; these
 * helpers convert to/from major units and format for display without ever storing a
 * float as money (Constitution V — money/minor-unit correctness). No I/O, no mutation.
 */

import { DomainException } from '../common/domain.exception';
import { assertCurrency, type CurrencyCode } from './currency';

/** Round-half-up to the nearest integer, symmetric for negative numbers. */
export function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** 10 ** decimals as an integer factor (1 major unit = factor minor units). */
export function minorFactor(decimals: number): number {
  return Math.pow(10, decimals);
}

/** Convert a major-unit amount (e.g. 12.34) to integer minor units for a currency. */
export function toMinorUnits(amountMajor: number, code: CurrencyCode): number {
  const { decimals } = assertCurrency(code);
  return roundHalfUp(amountMajor * minorFactor(decimals));
}

/** Convert integer minor units back to a major-unit number for a currency. */
export function fromMinorUnits(
  amountMinor: number,
  code: CurrencyCode,
): number {
  const { decimals } = assertCurrency(code);
  return amountMinor / minorFactor(decimals);
}

/**
 * Validate that a value is a usable positive integer minor-unit amount. Throws
 * INVALID_AMOUNT at the boundary otherwise (no floats, no non-positive money).
 */
export function assertMinorAmount(amountMinor: number): number {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new DomainException(
      'INVALID_AMOUNT',
      'Amount must be a positive integer in minor units',
      400,
    );
  }
  return amountMinor;
}

/** Format an integer minor-unit amount for display, e.g. `6475` KES → `KSh 64.75`. */
export function formatMinorUnits(
  amountMinor: number,
  code: CurrencyCode,
): string {
  const { decimals, symbol } = assertCurrency(code);
  const major = fromMinorUnits(amountMinor, code).toFixed(decimals);
  return `${symbol} ${major}`;
}
