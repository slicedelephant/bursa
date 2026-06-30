import { Injectable, Logger } from '@nestjs/common';
import {
  BankFeedProvider,
  BankFeedRequest,
  BankFeedTransaction,
} from './bank-feed.provider.interface';

/**
 * Real Plaid adapter behind the same BankFeedProvider seam. Selected only when
 * BANK_FEED_PROVIDER=plaid AND a PLAID_SECRET is present (see the factory);
 * otherwise the deterministic Mock is used, so the app runs with no keys and the
 * test suite never touches the network.
 *
 * It calls the Plaid API over `fetch` (no SDK dependency), so this file compiles
 * with zero extra deps. It is NOT exercised in tests — only the mock runs there.
 */
@Injectable()
export class PlaidBankFeedProvider implements BankFeedProvider {
  readonly name = 'plaid';
  private readonly logger = new Logger(PlaidBankFeedProvider.name);
  private static readonly BASE_URL = 'https://production.plaid.com';

  constructor(
    private readonly secret: string,
    private readonly clientId: string = '',
  ) {
    if (!secret) {
      throw new Error('PlaidBankFeedProvider requires PLAID_SECRET');
    }
  }

  async fetchTransactions(
    request: BankFeedRequest,
  ): Promise<readonly BankFeedTransaction[]> {
    try {
      const res = await fetch(
        `${PlaidBankFeedProvider.BASE_URL}/transactions/get`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            client_id: this.clientId,
            secret: this.secret,
            // A real integration maps schoolId → an access_token for the linked
            // bank account; the prototype keeps the wiring illustrative.
            access_token: request.schoolId,
            start_date: request.since.toISOString().slice(0, 10),
            end_date: new Date().toISOString().slice(0, 10),
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`Plaid API returned ${res.status}`);
      }
      const json = (await res.json()) as {
        transactions?: Array<{
          transaction_id: string;
          amount: number;
          iso_currency_code?: string;
          name?: string;
          date: string;
        }>;
      };
      return (json.transactions ?? []).map((t) => ({
        externalId: t.transaction_id,
        // Plaid amounts are in major units (debits positive); credits to the
        // school are negative, so we flip the sign and convert to cents.
        amountCents: Math.round(Math.abs(t.amount) * 100),
        currency: t.iso_currency_code ?? 'EUR',
        reference: t.name ?? null,
        postedAt: new Date(t.date),
        raw: t as unknown as Record<string, unknown>,
      }));
    } catch (error) {
      this.logger.error('Plaid transaction fetch failed', error as Error);
      throw error instanceof Error
        ? error
        : new Error('Plaid transaction fetch failed');
    }
  }
}
