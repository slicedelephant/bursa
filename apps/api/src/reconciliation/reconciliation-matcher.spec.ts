import {
  BankTxForMatch,
  MATCH_DATE_WINDOW_HOURS,
  PayoutForMatch,
  reconcile,
  STALE_AFTER_HOURS,
} from './reconciliation-matcher';

const now = new Date('2026-06-30T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

const payout = (overrides: Partial<PayoutForMatch> = {}): PayoutForMatch => ({
  payoutId: 'p1',
  schoolId: 'school-1',
  amountCents: 40000,
  currency: 'EUR',
  reference: 'PAYOUT-REF-1',
  status: 'SENT',
  sentAt: hoursAgo(2),
  ...overrides,
});

const bankTx = (overrides: Partial<BankTxForMatch> = {}): BankTxForMatch => ({
  externalId: 'btx-1',
  amountCents: 40000,
  currency: 'EUR',
  reference: 'PAYOUT-REF-1',
  postedAt: hoursAgo(1),
  ...overrides,
});

describe('reconciliation-matcher', () => {
  it('matches by exact reference (case-insensitive)', () => {
    const result = reconcile(
      [payout()],
      [bankTx({ reference: 'payout-ref-1' })],
      now,
    );
    expect(result.rows[0].status).toBe('MATCHED');
    expect(result.rows[0].bankTx?.externalId).toBe('btx-1');
    expect(result.unmatchedBankTx).toHaveLength(0);
  });

  it('matches by amount within the date window when references differ', () => {
    const result = reconcile(
      [payout({ reference: 'SYS-REF' })],
      [bankTx({ reference: 'BANK-REF', postedAt: hoursAgo(1) })],
      now,
    );
    expect(result.rows[0].status).toBe('MATCHED');
  });

  it('does not match by amount outside the date window', () => {
    const result = reconcile(
      [payout({ reference: 'SYS-REF', sentAt: hoursAgo(2) })],
      [
        bankTx({
          reference: 'BANK-REF',
          postedAt: hoursAgo(2 + MATCH_DATE_WINDOW_HOURS + 1),
        }),
      ],
      now,
    );
    expect(result.rows[0].status).not.toBe('MATCHED');
    expect(result.unmatchedBankTx).toHaveLength(1);
  });

  it('classifies a recently-sent unmatched payout as PENDING', () => {
    const result = reconcile([payout({ sentAt: hoursAgo(2) })], [], now);
    expect(result.rows[0].status).toBe('PENDING');
  });

  it('classifies a stale (>48h) unmatched SENT payout as UNMATCHED', () => {
    const result = reconcile(
      [payout({ sentAt: hoursAgo(STALE_AFTER_HOURS + 1) })],
      [],
      now,
    );
    expect(result.rows[0].status).toBe('UNMATCHED');
  });

  it('classifies a not-yet-sent payout as PENDING', () => {
    const result = reconcile(
      [payout({ status: 'PENDING', sentAt: null })],
      [],
      now,
    );
    expect(result.rows[0].status).toBe('PENDING');
  });

  it('surfaces orphan bank transactions with no system payout', () => {
    const result = reconcile(
      [],
      [bankTx({ externalId: 'orphan', reference: 'NO-PAYOUT' })],
      now,
    );
    expect(result.rows).toHaveLength(0);
    expect(result.unmatchedBankTx).toHaveLength(1);
    expect(result.unmatchedBankTx[0].externalId).toBe('orphan');
  });

  it('consumes each bank transaction by at most one payout', () => {
    const result = reconcile(
      [
        payout({ payoutId: 'p1', reference: 'SAME' }),
        payout({ payoutId: 'p2', reference: 'SAME' }),
      ],
      [bankTx({ externalId: 'only', reference: 'SAME' })],
      now,
    );
    const matched = result.rows.filter((r) => r.status === 'MATCHED');
    expect(matched).toHaveLength(1);
    // The second payout falls through to a non-matched classification.
    expect(result.rows[1].status).not.toBe('MATCHED');
  });
});
