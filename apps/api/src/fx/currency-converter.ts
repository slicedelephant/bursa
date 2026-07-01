/**
 * E20 — pure locked-rate currency converter. Converts an integer minor-unit amount
 * from one currency to another using a rate frozen at donation time (`lockedRate`).
 * The RATE is a float, but the money stays integer: we convert via major units and
 * round half-up to the target currency's decimals. Same-currency is an identity no-op
 * (no rounding drift). No I/O, no mutation — returns a new object.
 */

import { DomainException } from '../common/domain.exception';
import { assertCurrency, type CurrencyCode } from './currency';
import { minorFactor, roundHalfUp } from './money-minor-unit';

/**
 * Nudge a value by a tiny relative epsilon before rounding, so binary float drift
 * (e.g. 100 * 1.005 = 100.49999999999999) does not swallow a legitimate half-up.
 * The epsilon is far smaller than one minor unit, so it never changes a real result.
 */
function correctFloat(value: number): number {
  const epsilon = Math.abs(value) * 1e-9;
  return value >= 0 ? value + epsilon : value - epsilon;
}

export interface ConversionInput {
  readonly amountMinor: number;
  readonly from: CurrencyCode;
  readonly to: CurrencyCode;
  /** Frozen rate: 1 unit of `from` = `lockedRate` units of `to`. */
  readonly lockedRate: number;
}

export interface ConversionResult {
  readonly amountMinor: number;
  readonly from: CurrencyCode;
  readonly to: CurrencyCode;
  readonly rate: number;
}

/**
 * Convert `amountMinor` (in `from`) to `to` at `lockedRate`. Same currency ignores the
 * rate and returns the amount unchanged. Throws INVALID_AMOUNT / UNKNOWN_RATE_PAIR at
 * the boundary for a non-integer amount or a non-positive rate on a cross-currency move.
 */
export function convertMinorUnits(input: ConversionInput): ConversionResult {
  const fromInfo = assertCurrency(input.from);
  const toInfo = assertCurrency(input.to);

  if (!Number.isInteger(input.amountMinor)) {
    throw new DomainException(
      'INVALID_AMOUNT',
      'Amount must be an integer in minor units',
      400,
    );
  }

  if (input.from === input.to) {
    return {
      amountMinor: input.amountMinor,
      from: input.from,
      to: input.to,
      rate: 1,
    };
  }

  if (!(input.lockedRate > 0)) {
    throw new DomainException(
      'UNKNOWN_RATE_PAIR',
      `No valid rate for ${input.from}->${input.to}`,
      400,
    );
  }

  // Convert in minor-unit space to keep the math integer-anchored, then round once.
  // toMinor = fromMinor * rate * (10^toDecimals / 10^fromDecimals).
  const scale = minorFactor(toInfo.decimals) / minorFactor(fromInfo.decimals);
  const raw = input.amountMinor * input.lockedRate * scale;
  const amountMinor = roundHalfUp(correctFloat(raw));

  return {
    amountMinor,
    from: fromInfo.code,
    to: toInfo.code,
    rate: input.lockedRate,
  };
}
