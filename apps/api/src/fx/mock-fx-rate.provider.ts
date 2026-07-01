import { Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import type { RateTableEntry } from './locked-rate';
import {
  FxRateProvider,
  FxRateRequest,
  FxRateResult,
} from './fx-rate.provider.interface';

/**
 * Deterministic mock FX-rate provider — no network. Rates are a fixed table (USD as the
 * hub currency); inverse pairs are derived. Same currency is 1.0. Unknown pairs throw
 * UNKNOWN_RATE_PAIR at the boundary. `asOf` uses a fixed clock injected in tests.
 */
@Injectable()
export class MockFxRateProvider implements FxRateProvider {
  readonly name = 'mock';

  /** USD-hub reference rates (1 USD = rate quote). Cross rates are derived. */
  private static readonly USD_RATES: Readonly<Record<string, number>> = {
    EUR: 0.92,
    KES: 129.5,
    NGN: 1550.0,
    GHS: 15.3,
    BDT: 118.0,
    PHP: 57.4,
    VND: 25400.0,
  };

  constructor(private readonly clock: () => Date = () => new Date()) {}

  /** The full derived rate table (all supported cross pairs) — used by the seed/tests. */
  static table(): RateTableEntry[] {
    const codes = ['USD', ...Object.keys(MockFxRateProvider.USD_RATES)];
    const entries: RateTableEntry[] = [];
    for (const base of codes) {
      for (const quote of codes) {
        if (base === quote) continue;
        const rate = MockFxRateProvider.rate(base, quote);
        if (rate !== undefined) {
          entries.push({
            base: base as RateTableEntry['base'],
            quote: quote as RateTableEntry['quote'],
            rate,
          });
        }
      }
    }
    return entries;
  }

  private static rate(base: string, quote: string): number | undefined {
    if (base === 'USD') return MockFxRateProvider.USD_RATES[quote];
    if (quote === 'USD') {
      const r = MockFxRateProvider.USD_RATES[base];
      return r ? 1 / r : undefined;
    }
    const baseUsd = MockFxRateProvider.USD_RATES[base];
    const quoteUsd = MockFxRateProvider.USD_RATES[quote];
    if (!baseUsd || !quoteUsd) return undefined;
    return quoteUsd / baseUsd;
  }

  async getRate(request: FxRateRequest): Promise<FxRateResult> {
    const asOf = this.clock().toISOString();
    if (request.base === request.quote) {
      return { base: request.base, quote: request.quote, rate: 1, asOf };
    }
    const rate = MockFxRateProvider.rate(request.base, request.quote);
    if (rate === undefined || !(rate > 0)) {
      throw new DomainException(
        'UNKNOWN_RATE_PAIR',
        `No rate for ${request.base}->${request.quote}`,
        400,
      );
    }
    return { base: request.base, quote: request.quote, rate, asOf };
  }
}
