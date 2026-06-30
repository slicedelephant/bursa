/**
 * E12 Reconciliation — pure assembler that composes the matcher, discrepancy
 * detector and stale-alert outputs into the stable `ReconciliationView` from the
 * contract. No I/O, no mutation (Constitution IV).
 */

import { detectDiscrepancies } from './discrepancy-detector';
import {
  BankTxForMatch,
  MatchedRow,
  PayoutForMatch,
  reconcile,
} from './reconciliation-matcher';
import { buildStaleAlerts, StaleAlert } from './stale-payout-alert';

export interface BankTxView {
  externalId: string;
  amountCents: number;
  currency: string;
  reference: string | null;
  postedAt: string;
}

export interface PayoutRowView {
  payoutId: string;
  campaignTitle: string;
  amountCents: number;
  currency: string;
  payoutStatus: 'PENDING' | 'SENT' | 'CONFIRMED';
  reconciliationStatus: 'MATCHED' | 'PENDING' | 'UNMATCHED' | 'DISCREPANCY';
  bankTx: BankTxView | null;
  discrepancyCents: number | null;
  sentAt: string | null;
}

export interface StaleAlertView extends StaleAlert {
  campaignTitle: string;
}

export interface ReconciliationView {
  schoolId: string;
  runAt: string;
  summary: {
    matchedCount: number;
    pendingCount: number;
    unmatchedCount: number;
    discrepancyCount: number;
    bankTxCount: number;
  };
  rows: PayoutRowView[];
  unmatchedBankTx: BankTxView[];
  alerts: StaleAlertView[];
}

/** A payout enriched with its campaign title for the view. */
export interface PayoutWithTitle extends PayoutForMatch {
  readonly campaignTitle: string;
}

function toBankTxView(tx: BankTxForMatch): BankTxView {
  return {
    externalId: tx.externalId,
    amountCents: tx.amountCents,
    currency: tx.currency,
    reference: tx.reference,
    postedAt: tx.postedAt.toISOString(),
  };
}

/**
 * Run the full reconciliation and build the view. Pure: given the same payouts,
 * bank transactions and clock, it returns the same view.
 */
export function buildReconciliationView(
  schoolId: string,
  payouts: readonly PayoutWithTitle[],
  bankTx: readonly BankTxForMatch[],
  now: Date = new Date(),
): ReconciliationView {
  const titleById = new Map(payouts.map((p) => [p.payoutId, p.campaignTitle]));

  const matched = reconcile(payouts, bankTx, now);
  const detection = detectDiscrepancies(matched.rows, matched.unmatchedBankTx);

  // Map back to the original payout for status/sentAt/title.
  const payoutById = new Map(payouts.map((p) => [p.payoutId, p]));
  const rows: PayoutRowView[] = detection.rows.map((row) => {
    const payout = payoutById.get(row.payoutId)!;
    return {
      payoutId: row.payoutId,
      campaignTitle: payout.campaignTitle,
      amountCents: payout.amountCents,
      currency: payout.currency,
      payoutStatus: payout.status,
      reconciliationStatus: row.status,
      bankTx: row.bankTx ? toBankTxView(row.bankTx) : null,
      discrepancyCents: row.discrepancyCents,
      sentAt: payout.sentAt ? payout.sentAt.toISOString() : null,
    };
  });

  const alertRows: MatchedRow[] = detection.rows.map((row) => ({
    payout: payoutById.get(row.payoutId)!,
    status: row.status === 'DISCREPANCY' ? 'MATCHED' : row.status,
    bankTx: null,
  }));
  const alerts: StaleAlertView[] = buildStaleAlerts(
    alertRows.map((r) => ({ payout: r.payout, status: r.status })),
    now,
  ).map((a) => ({
    ...a,
    // Every alert originates from a payout, so its title is always present.
    campaignTitle: titleById.get(a.payoutId) as string,
  }));

  return {
    schoolId,
    runAt: now.toISOString(),
    summary: {
      ...detection.summary,
      bankTxCount: bankTx.length,
    },
    rows,
    unmatchedBankTx: matched.unmatchedBankTx.map(toBankTxView),
    alerts,
  };
}
