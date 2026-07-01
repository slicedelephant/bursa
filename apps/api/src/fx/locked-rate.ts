/**
 * E20 — pure locked-rate quoting. Freezes the FX rate at donation time from an INJECTED
 * rate table (never a network call; the provider only supplies raw rates). The result
 * carries the base/quote pair, the frozen rate and `quotedAt`. `now` is injected — no
 * `Date.now()` in the pure fn. No mutation; returns a new object.
 */

import { DomainException } from '../common/domain.exception';
import { assertCurrency, type CurrencyCode } from './currency';

/** A raw rate entry: 1 `base` = `rate` `quote`. */
export interface RateTableEntry {
  readonly base: CurrencyCode;
  readonly quote: CurrencyCode;
  readonly rate: number;
}

export interface LockedRateQuote {
  readonly base: CurrencyCode;
  readonly quote: CurrencyCode;
  readonly rate: number;
  readonly quotedAt: string;
}

export interface QuoteInput {
  readonly base: CurrencyCode;
  readonly quote: CurrencyCode;
  readonly table: readonly RateTableEntry[];
  readonly now: Date;
}

/** Look up a rate from the injected table, honouring inverse pairs. */
function lookupRate(
  table: readonly RateTableEntry[],
  base: CurrencyCode,
  quote: CurrencyCode,
): number | undefined {
  const direct = table.find((e) => e.base === base && e.quote === quote);
  if (direct) {
    return direct.rate;
  }
  const inverse = table.find((e) => e.base === quote && e.quote === base);
  if (inverse && inverse.rate > 0) {
    return 1 / inverse.rate;
  }
  return undefined;
}

/**
 * Quote (freeze) the rate for a base->quote pair from the injected table. Same currency
 * is a 1.0 identity. Unknown pair throws UNKNOWN_RATE_PAIR at the boundary.
 */
export function quoteLockedRate(input: QuoteInput): LockedRateQuote {
  assertCurrency(input.base);
  assertCurrency(input.quote);

  if (input.base === input.quote) {
    return {
      base: input.base,
      quote: input.quote,
      rate: 1,
      quotedAt: input.now.toISOString(),
    };
  }

  const rate = lookupRate(input.table, input.base, input.quote);
  if (rate === undefined || !(rate > 0)) {
    throw new DomainException(
      'UNKNOWN_RATE_PAIR',
      `No rate for ${input.base}->${input.quote}`,
      400,
    );
  }

  return {
    base: input.base,
    quote: input.quote,
    rate,
    quotedAt: input.now.toISOString(),
  };
}
