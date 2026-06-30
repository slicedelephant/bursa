// Pure presentation helpers for the payout reconciliation panel (E12). Money
// formatting, reconciliation-status chips, summary tiles and discrepancy/alert
// formatting. No Angular, no I/O; returns new values only.

import { ReconciliationRowStatus } from '../../core/models';

export function formatEur(cents: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(cents) / 100);
}

const STATUS_LABELS: Record<ReconciliationRowStatus, string> = {
  MATCHED: 'Matched',
  PENDING: 'Pending',
  UNMATCHED: 'Unmatched',
  DISCREPANCY: 'Discrepancy',
};

export function reconStatusLabel(status: ReconciliationRowStatus): string {
  return STATUS_LABELS[status] ?? 'Unknown';
}

export function reconStatusClass(status: ReconciliationRowStatus): string {
  switch (status) {
    case 'MATCHED':
      return 'bg-brand-green/10 text-brand-green ring-brand-green/30';
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 ring-amber-300';
    case 'DISCREPANCY':
      return 'bg-brand-orange/10 text-brand-orange ring-brand-orange/30';
    case 'UNMATCHED':
    default:
      return 'bg-rose-50 text-rose-700 ring-rose-300';
  }
}

export interface ReconciliationSummary {
  readonly matchedCount: number;
  readonly pendingCount: number;
  readonly unmatchedCount: number;
  readonly discrepancyCount: number;
  readonly bankTxCount: number;
}

export interface SummaryTile {
  readonly label: string;
  readonly value: string;
  readonly tone: 'good' | 'warn' | 'bad' | 'neutral';
}

export function summaryTiles(summary: ReconciliationSummary): SummaryTile[] {
  return [
    { label: 'Matched', value: String(summary.matchedCount), tone: 'good' },
    { label: 'Pending', value: String(summary.pendingCount), tone: 'warn' },
    {
      label: 'Unmatched',
      value: String(summary.unmatchedCount),
      tone: summary.unmatchedCount > 0 ? 'bad' : 'neutral',
    },
    {
      label: 'Discrepancies',
      value: String(summary.discrepancyCount),
      tone: summary.discrepancyCount > 0 ? 'bad' : 'neutral',
    },
  ];
}

export function tileToneClass(tone: SummaryTile['tone']): string {
  switch (tone) {
    case 'good':
      return 'text-brand-green';
    case 'warn':
      return 'text-amber-600';
    case 'bad':
      return 'text-brand-orange';
    case 'neutral':
    default:
      return 'text-ink';
  }
}

/** A signed discrepancy like "-€5" / "+€2", or empty when none. */
export function formatDiscrepancy(cents: number | null): string {
  if (cents === null || cents === 0) return '';
  const sign = cents > 0 ? '+' : '-';
  return `${sign}${formatEur(Math.abs(cents))}`;
}

/** Human alert line: "Amara Okonkwo — €400 unconfirmed for 72h". */
export function formatStaleAlert(alert: {
  campaignTitle: string;
  amountCents: number;
  hoursStale: number;
}): string {
  return `${alert.campaignTitle} — ${formatEur(
    alert.amountCents,
  )} unconfirmed for ${alert.hoursStale}h`;
}

/** True when the reconciliation needs the operator's attention. */
export function needsAttention(summary: ReconciliationSummary): boolean {
  return summary.unmatchedCount > 0 || summary.discrepancyCount > 0;
}
