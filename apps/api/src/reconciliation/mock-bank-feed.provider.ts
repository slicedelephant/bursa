import { Injectable } from '@nestjs/common';
import {
  BankFeedPayoutContext,
  BankFeedProvider,
  BankFeedRequest,
  BankFeedTransaction,
} from './bank-feed.provider.interface';

/**
 * Deterministic mock bank-feed — no external calls. It derives bank transactions
 * from the school's system payouts so reconciliation is demoable end to end:
 *
 *  - default payout         → a matching bank tx (same reference + amount)
 *  - reference ends `-STALE` → NO bank tx (payout stays unmatched → 48h alert)
 *  - reference ends `-DISCREPANCY` → a bank tx with an off-by-100c amount
 *  - plus one fixed "orphan" bank tx with no matching payout
 *
 * Only payouts that have actually been sent (sentAt set) produce a bank tx.
 */
@Injectable()
export class MockBankFeedProvider implements BankFeedProvider {
  readonly name = 'mock';
  private static readonly DISCREPANCY_DELTA_CENTS = 100;

  async fetchTransactions(
    request: BankFeedRequest,
  ): Promise<readonly BankFeedTransaction[]> {
    const txns: BankFeedTransaction[] = [];

    for (const payout of request.payouts) {
      const tx = this.deriveTransaction(payout);
      if (tx) txns.push(tx);
    }

    // One deterministic orphan transaction so the "bank tx without a system
    // payout" path is demoable. Stable id per school keeps it idempotent.
    txns.push({
      externalId: `mock_orphan_${request.schoolId}`,
      amountCents: 4200,
      currency: 'EUR',
      reference: 'UNKNOWN-INBOUND',
      postedAt: this.recentDate(request.since, 6),
      raw: { source: 'mock', kind: 'orphan' },
    });

    return txns;
  }

  private deriveTransaction(
    payout: BankFeedPayoutContext,
  ): BankFeedTransaction | null {
    if (!payout.sentAt) return null;
    const ref = payout.reference.trim();

    if (ref.toUpperCase().endsWith('-STALE')) {
      return null; // No bank counterpart → stale/unmatched.
    }

    const isDiscrepancy = ref.toUpperCase().endsWith('-DISCREPANCY');
    const amountCents = isDiscrepancy
      ? payout.amountCents - MockBankFeedProvider.DISCREPANCY_DELTA_CENTS
      : payout.amountCents;

    return {
      externalId: `mock_btx_${payout.payoutId}`,
      amountCents,
      currency: payout.currency,
      reference: payout.reference,
      postedAt: this.postedAfter(payout.sentAt),
      raw: { source: 'mock', payoutId: payout.payoutId },
    };
  }

  /** Bank posts ~1h after the payout was sent (deterministic). */
  private postedAfter(sentAt: Date): Date {
    return new Date(sentAt.getTime() + 3_600_000);
  }

  private recentDate(since: Date, hoursAfter: number): Date {
    return new Date(since.getTime() + hoursAfter * 3_600_000);
  }
}
