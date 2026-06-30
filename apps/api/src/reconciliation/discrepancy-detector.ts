/**
 * E12 Reconciliation — pure discrepancy detector. Takes the matcher's rows and
 * elevates a reference-matched row whose bank amount differs from the system
 * amount to DISCREPANCY (carrying the cent difference). Also classifies leftover
 * bank transactions as orphans. No I/O, no mutation (Constitution IV).
 */

import { MatchedRow, BankTxForMatch } from './reconciliation-matcher';

export type FinalReconciliationStatus =
  | 'MATCHED'
  | 'PENDING'
  | 'UNMATCHED'
  | 'DISCREPANCY';

export interface ReconciledRow {
  readonly payoutId: string;
  readonly status: FinalReconciliationStatus;
  readonly bankTx: BankTxForMatch | null;
  /** Cents difference (bank - system) when DISCREPANCY, else null. */
  readonly discrepancyCents: number | null;
}

export interface OrphanBankTx {
  readonly externalId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly reference: string | null;
}

/**
 * Apply discrepancy detection to a single matched row. A row matched to a bank
 * transaction whose amount differs becomes DISCREPANCY; otherwise the matcher's
 * status is kept.
 */
export function detectRow(row: MatchedRow): ReconciledRow {
  if (row.status === 'MATCHED' && row.bankTx) {
    const diff = row.bankTx.amountCents - row.payout.amountCents;
    if (diff !== 0) {
      return {
        payoutId: row.payout.payoutId,
        status: 'DISCREPANCY',
        bankTx: row.bankTx,
        discrepancyCents: diff,
      };
    }
  }
  return {
    payoutId: row.payout.payoutId,
    status: row.status,
    bankTx: row.status === 'MATCHED' ? row.bankTx : null,
    discrepancyCents: null,
  };
}

export interface DetectionResult {
  readonly rows: readonly ReconciledRow[];
  readonly orphanBankTx: readonly OrphanBankTx[];
  readonly summary: {
    readonly matchedCount: number;
    readonly pendingCount: number;
    readonly unmatchedCount: number;
    readonly discrepancyCount: number;
  };
}

/** Detect discrepancies across all rows and summarise the counts. */
export function detectDiscrepancies(
  rows: readonly MatchedRow[],
  unmatchedBankTx: readonly BankTxForMatch[],
): DetectionResult {
  const detected = rows.map(detectRow);

  const summary = detected.reduce(
    (acc, row) => ({
      matchedCount: acc.matchedCount + (row.status === 'MATCHED' ? 1 : 0),
      pendingCount: acc.pendingCount + (row.status === 'PENDING' ? 1 : 0),
      unmatchedCount: acc.unmatchedCount + (row.status === 'UNMATCHED' ? 1 : 0),
      discrepancyCount:
        acc.discrepancyCount + (row.status === 'DISCREPANCY' ? 1 : 0),
    }),
    {
      matchedCount: 0,
      pendingCount: 0,
      unmatchedCount: 0,
      discrepancyCount: 0,
    },
  );

  const orphanBankTx: OrphanBankTx[] = unmatchedBankTx.map((tx) => ({
    externalId: tx.externalId,
    amountCents: tx.amountCents,
    currency: tx.currency,
    reference: tx.reference,
  }));

  return { rows: detected, orphanBankTx, summary };
}
