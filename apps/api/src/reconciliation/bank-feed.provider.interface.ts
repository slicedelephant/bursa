/**
 * E12 — The single seam between reconciliation and any bank-feed source (Plaid,
 * an open-banking aggregator, …). The prototype ships MockBankFeedProvider; a real
 * adapter must implement this same interface with zero domain changes. No real
 * bank call is made anywhere in the prototype.
 *
 * The provider only returns raw bank transactions for a school's account since a
 * given date; all matching/discrepancy/alert logic lives in the pure cores
 * (`reconciliation-matcher.ts`, `discrepancy-detector.ts`, `stale-payout-alert.ts`),
 * so the provider stays thin.
 */

export interface BankFeedTransaction {
  /** Idempotent provider-side transaction id. */
  readonly externalId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly reference: string | null;
  readonly postedAt: Date;
  /** Raw provider payload (illustrative). */
  readonly raw?: Record<string, unknown>;
}

/** Context the provider needs: the system payouts it can derive/return feed for. */
export interface BankFeedPayoutContext {
  readonly payoutId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly reference: string;
  readonly sentAt: Date | null;
}

export interface BankFeedRequest {
  readonly schoolId: string;
  readonly since: Date;
  /** The system payouts for the school, so the mock can derive a realistic feed. */
  readonly payouts: readonly BankFeedPayoutContext[];
}

export interface BankFeedProvider {
  /** Fetch bank transactions for a school's account since a date. */
  fetchTransactions(
    request: BankFeedRequest,
  ): Promise<readonly BankFeedTransaction[]>;
}

export const BANK_FEED_PROVIDER = Symbol('BANK_FEED_PROVIDER');
