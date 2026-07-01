/**
 * E20 — the single seam between FX handling and any rate source (mock / a real provider
 * like a bank feed or Wise). The prototype ships `MockFxRateProvider` (a deterministic
 * table, no network). A real adapter must implement this same interface with zero domain
 * changes — the PaymentProvider line.
 *
 * The provider ONLY returns a raw rate for a pair. The freezing (`quoteLockedRate`) and
 * all conversion are pure logic around it, so the provider stays thin and swappable and
 * the money math stays deterministic and testable.
 */

export interface FxRateRequest {
  readonly base: string;
  readonly quote: string;
}

export interface FxRateResult {
  readonly base: string;
  readonly quote: string;
  /** 1 unit of `base` = `rate` units of `quote`. */
  readonly rate: number;
  readonly asOf: string;
}

export interface FxRateProvider {
  getRate(request: FxRateRequest): Promise<FxRateResult>;
}

export const FX_RATE_PROVIDER = Symbol('FX_RATE_PROVIDER');
