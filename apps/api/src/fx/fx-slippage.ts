/**
 * E20 — pure FX-slippage calculator. Given the amount, the rate we locked in at
 * donation time and the rate that actually settled later, compute the slippage in the
 * target currency's minor units and in basis points. Positive = the platform gained
 * (settled better than locked), negative = loss. No I/O, no mutation; injected rates.
 */

import { type CurrencyCode } from './currency';
import { assertCurrency } from './currency';
import { fromMinorUnits, minorFactor, roundHalfUp } from './money-minor-unit';

export type SlippageDirection = 'GAIN' | 'LOSS' | 'FLAT';

export interface FxSlippageInput {
  /** Amount in the SOURCE currency, minor units. */
  readonly amountMinor: number;
  readonly from: CurrencyCode;
  readonly to: CurrencyCode;
  readonly lockedRate: number;
  readonly settledRate: number;
}

export interface FxSlippage {
  /** Difference (settled - locked) in target-currency minor units. */
  readonly slippageMinor: number;
  /** Difference in basis points of the locked rate (1 bp = 0.01%). */
  readonly slippageBps: number;
  readonly direction: SlippageDirection;
}

/** Compute the slippage between a locked and a settled rate for an amount. */
export function computeFxSlippage(input: FxSlippageInput): FxSlippage {
  const toInfo = assertCurrency(input.to);
  assertCurrency(input.from);

  const major = fromMinorUnits(input.amountMinor, input.from);
  const lockedTargetMinor = roundHalfUp(
    major * input.lockedRate * minorFactor(toInfo.decimals),
  );
  const settledTargetMinor = roundHalfUp(
    major * input.settledRate * minorFactor(toInfo.decimals),
  );

  const slippageMinor = settledTargetMinor - lockedTargetMinor;

  const slippageBps =
    input.lockedRate === 0
      ? 0
      : roundHalfUp(
          ((input.settledRate - input.lockedRate) / input.lockedRate) * 10000,
        );

  const direction: SlippageDirection =
    slippageMinor > 0 ? 'GAIN' : slippageMinor < 0 ? 'LOSS' : 'FLAT';

  return { slippageMinor, slippageBps, direction };
}
