/**
 * E12 Reconciliation — pure 48h stale-payout alert. Flags a payout that exists in
 * the system as SENT but has no bank-feed match after STALE_AFTER_HOURS. No I/O,
 * no mutation; returns new values only (Constitution IV).
 */

import { FinalReconciliationStatus } from './discrepancy-detector';
import { PayoutForMatch, STALE_AFTER_HOURS } from './reconciliation-matcher';

export interface StaleAlert {
  readonly payoutId: string;
  readonly amountCents: number;
  readonly hoursStale: number;
}

export interface AlertInputRow {
  readonly payout: PayoutForMatch;
  readonly status: FinalReconciliationStatus;
}

function hoursSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / 3_600_000);
}

/** True when a SENT payout has no match and is older than STALE_AFTER_HOURS. */
export function isStale(row: AlertInputRow, now: Date): boolean {
  if (row.status !== 'UNMATCHED') return false;
  const sentAt = row.payout.sentAt;
  if (!sentAt) return false;
  return hoursSince(sentAt, now) >= STALE_AFTER_HOURS;
}

/** Build the list of stale-payout alerts from reconciled rows. */
export function buildStaleAlerts(
  rows: readonly AlertInputRow[],
  now: Date = new Date(),
): StaleAlert[] {
  const alerts: StaleAlert[] = [];
  for (const row of rows) {
    // isStale already guarantees a non-null sentAt; assert it for the calc.
    if (!isStale(row, now)) continue;
    const sentAt = row.payout.sentAt as Date;
    alerts.push({
      payoutId: row.payout.payoutId,
      amountCents: row.payout.amountCents,
      hoursStale: hoursSince(sentAt, now),
    });
  }
  return alerts;
}
