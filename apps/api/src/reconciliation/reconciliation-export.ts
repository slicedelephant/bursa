/**
 * E12 Reconciliation — pure CSV/PDF-line builders for the payout reconciliation
 * list. Reuses the same RFC-4180-ish escaping line as the E5 ESG export. No I/O,
 * no mutation (Constitution IV). The PDF lines feed the reused E5 `buildSimplePdf`.
 */

import { PayoutRowView } from './reconciliation-view';

function eur(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** RFC-4180-ish escaping: quote + double inner quotes when needed (E5 line). */
function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function dateOnly(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

const CSV_HEADER = [
  'Payout',
  'Campaign',
  'Amount (EUR)',
  'Payout Status',
  'Reconciliation',
  'Bank Reference',
  'Discrepancy (EUR)',
  'Sent At',
];

/** Build the reconciliation payout list as a CSV string. */
export function payoutsToCsv(rows: readonly PayoutRowView[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        cell(r.payoutId),
        cell(r.campaignTitle),
        eur(r.amountCents),
        r.payoutStatus,
        r.reconciliationStatus,
        cell(r.bankTx?.reference ?? ''),
        r.discrepancyCents === null ? '' : eur(r.discrepancyCents),
        dateOnly(r.sentAt),
      ].join(','),
    );
  }
  return lines.join('\n') + '\n';
}

/** Build the reconciliation payout list as plain text lines for the PDF writer. */
export function payoutsToPdfLines(rows: readonly PayoutRowView[]): string[] {
  if (rows.length === 0) {
    return ['No payouts yet.'];
  }
  return rows.map((r) => {
    const bank =
      r.reconciliationStatus === 'DISCREPANCY'
        ? `discrepancy ${eur(r.discrepancyCents ?? 0)} EUR`
        : r.bankTx
          ? `bank ${cell(r.bankTx.reference ?? r.bankTx.externalId)}`
          : 'no bank match';
    return `${dateOnly(r.sentAt)}  ${r.campaignTitle} — EUR ${eur(
      r.amountCents,
    )}  [${r.reconciliationStatus}] ${bank}`;
  });
}
