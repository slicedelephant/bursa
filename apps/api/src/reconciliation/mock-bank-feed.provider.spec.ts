import {
  BankFeedPayoutContext,
  BankFeedRequest,
} from './bank-feed.provider.interface';
import { MockBankFeedProvider } from './mock-bank-feed.provider';

const sentAt = new Date('2026-06-30T10:00:00.000Z');

const payout = (
  overrides: Partial<BankFeedPayoutContext> = {},
): BankFeedPayoutContext => ({
  payoutId: 'p1',
  amountCents: 40000,
  currency: 'EUR',
  reference: 'REF-1',
  sentAt,
  ...overrides,
});

const request = (payouts: BankFeedPayoutContext[]): BankFeedRequest => ({
  schoolId: 'school-1',
  since: new Date('2026-06-01T00:00:00.000Z'),
  payouts,
});

describe('MockBankFeedProvider', () => {
  const provider = new MockBankFeedProvider();

  it('derives a matching transaction for a normal payout', async () => {
    const txns = await provider.fetchTransactions(request([payout()]));
    const match = txns.find((t) => t.reference === 'REF-1');
    expect(match).toBeDefined();
    expect(match?.amountCents).toBe(40000);
    expect(match?.externalId).toBe('mock_btx_p1');
  });

  it('omits a bank tx for a -STALE payout', async () => {
    const txns = await provider.fetchTransactions(
      request([payout({ reference: 'REF-1-STALE' })]),
    );
    expect(txns.find((t) => t.reference === 'REF-1-STALE')).toBeUndefined();
  });

  it('produces an off-by-100c amount for a -DISCREPANCY payout', async () => {
    const txns = await provider.fetchTransactions(
      request([payout({ reference: 'REF-1-DISCREPANCY' })]),
    );
    const match = txns.find((t) => t.reference === 'REF-1-DISCREPANCY');
    expect(match?.amountCents).toBe(39900);
  });

  it('omits a bank tx for a payout that was never sent', async () => {
    const txns = await provider.fetchTransactions(
      request([payout({ sentAt: null })]),
    );
    expect(txns.find((t) => t.reference === 'REF-1')).toBeUndefined();
  });

  it('always includes a deterministic orphan transaction', async () => {
    const txns = await provider.fetchTransactions(request([]));
    const orphan = txns.find((t) => t.externalId === 'mock_orphan_school-1');
    expect(orphan).toBeDefined();
    expect(orphan?.reference).toBe('UNKNOWN-INBOUND');
  });

  it('is deterministic for the same input', async () => {
    const a = await provider.fetchTransactions(request([payout()]));
    const b = await provider.fetchTransactions(request([payout()]));
    expect(a.map((t) => t.externalId)).toEqual(b.map((t) => t.externalId));
  });
});
