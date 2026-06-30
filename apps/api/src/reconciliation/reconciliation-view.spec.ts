import { BankTxForMatch } from './reconciliation-matcher';
import {
  buildReconciliationView,
  PayoutWithTitle,
} from './reconciliation-view';

const now = new Date('2026-06-30T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

const payout = (overrides: Partial<PayoutWithTitle> = {}): PayoutWithTitle => ({
  payoutId: 'p1',
  schoolId: 'school-1',
  amountCents: 40000,
  currency: 'EUR',
  reference: 'REF-1',
  status: 'SENT',
  sentAt: hoursAgo(2),
  campaignTitle: 'Amara Okonkwo',
  ...overrides,
});

const tx = (overrides: Partial<BankTxForMatch> = {}): BankTxForMatch => ({
  externalId: 'btx-1',
  amountCents: 40000,
  currency: 'EUR',
  reference: 'REF-1',
  postedAt: hoursAgo(1),
  ...overrides,
});

describe('reconciliation-view', () => {
  it('builds a matched row with its bank transaction', () => {
    const view = buildReconciliationView('school-1', [payout()], [tx()], now);
    expect(view.summary.matchedCount).toBe(1);
    expect(view.rows[0].reconciliationStatus).toBe('MATCHED');
    expect(view.rows[0].bankTx?.externalId).toBe('btx-1');
    expect(view.rows[0].campaignTitle).toBe('Amara Okonkwo');
    expect(view.summary.bankTxCount).toBe(1);
  });

  it('flags a discrepancy when bank amount differs', () => {
    const view = buildReconciliationView(
      'school-1',
      [payout()],
      [tx({ amountCents: 39500 })],
      now,
    );
    expect(view.summary.discrepancyCount).toBe(1);
    expect(view.rows[0].reconciliationStatus).toBe('DISCREPANCY');
    expect(view.rows[0].discrepancyCents).toBe(-500);
  });

  it('produces a stale alert and an UNMATCHED row for a >48h unmatched payout', () => {
    const stale = payout({
      payoutId: 'stale',
      reference: 'REF-STALE',
      sentAt: hoursAgo(72),
    });
    const view = buildReconciliationView('school-1', [stale], [], now);
    expect(view.rows[0].reconciliationStatus).toBe('UNMATCHED');
    expect(view.alerts).toHaveLength(1);
    expect(view.alerts[0].payoutId).toBe('stale');
    expect(view.alerts[0].campaignTitle).toBe('Amara Okonkwo');
  });

  it('lists orphan bank transactions with postedAt', () => {
    const view = buildReconciliationView(
      'school-1',
      [],
      [tx({ externalId: 'orphan', reference: 'NONE' })],
      now,
    );
    expect(view.unmatchedBankTx).toHaveLength(1);
    expect(view.unmatchedBankTx[0].externalId).toBe('orphan');
    expect(view.unmatchedBankTx[0].postedAt).toBe(hoursAgo(1).toISOString());
  });

  it('does not alert on a discrepancy row (it is reconciled, not stale)', () => {
    const view = buildReconciliationView(
      'school-1',
      [payout({ sentAt: hoursAgo(72) })],
      [tx({ amountCents: 39500 })],
      now,
    );
    expect(view.summary.discrepancyCount).toBe(1);
    expect(view.alerts).toHaveLength(0);
  });

  it('reports a null sentAt for a not-yet-sent payout', () => {
    const view = buildReconciliationView(
      'school-1',
      [payout({ status: 'PENDING', sentAt: null })],
      [],
      now,
    );
    expect(view.rows[0].sentAt).toBeNull();
    expect(view.rows[0].reconciliationStatus).toBe('PENDING');
  });

  it('uses the current time when no clock is passed', () => {
    const view = buildReconciliationView('school-1', [payout()], [tx()]);
    expect(view.runAt).toBeDefined();
    expect(view.rows).toHaveLength(1);
  });
});
