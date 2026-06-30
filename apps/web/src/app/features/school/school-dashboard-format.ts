// Pure presentation helpers for the school dashboard (E8). Money formatting,
// payout-status chips, KPI tiles and donor-geography bars. No Angular, no I/O.

export type StudentPayoutStatus = 'NONE' | 'AWAITING_FUNDING' | 'READY' | 'SENT' | 'CONFIRMED';

export function formatEur(cents: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(cents) / 100);
}

const PAYOUT_LABELS: Record<StudentPayoutStatus, string> = {
  NONE: 'No payout',
  AWAITING_FUNDING: 'Awaiting funding',
  READY: 'Ready to disburse',
  SENT: 'Payout sent',
  CONFIRMED: 'Received by school',
};

export function payoutStatusLabel(status: StudentPayoutStatus): string {
  return PAYOUT_LABELS[status] ?? 'Unknown';
}

export function payoutStatusClass(status: StudentPayoutStatus): string {
  switch (status) {
    case 'CONFIRMED':
    case 'SENT':
      return 'bg-brand-green/10 text-brand-green ring-brand-green/30';
    case 'READY':
      return 'bg-brand-blue/10 text-brand-blue ring-brand-blue/30';
    case 'AWAITING_FUNDING':
      return 'bg-amber-50 text-amber-700 ring-amber-300';
    default:
      return 'bg-slate-100 text-slate2 ring-slate-300';
  }
}

export interface DashboardTotals {
  readonly totalStudents: number;
  readonly liveCampaigns: number;
  readonly fundedCampaigns: number;
  readonly totalGoalCents: number;
  readonly totalRaisedCents: number;
  readonly totalPaidOutCents: number;
  readonly pendingPayoutCents: number;
}

export interface KpiTile {
  readonly label: string;
  readonly value: string;
}

export function dashboardTiles(totals: DashboardTotals): KpiTile[] {
  return [
    { label: 'Students', value: String(totals.totalStudents) },
    { label: 'Total budget raised', value: formatEur(totals.totalRaisedCents) },
    { label: 'Paid out to school', value: formatEur(totals.totalPaidOutCents) },
    { label: 'Pending payout', value: formatEur(totals.pendingPayoutCents) },
  ];
}

export interface GeographyRowInput {
  readonly country: string;
  readonly donationCount: number;
  readonly amountCents: number;
}

export interface GeographyBar extends GeographyRowInput {
  readonly amountLabel: string;
  readonly widthPercent: string;
}

/** Bars scaled against the largest country amount (min 2% so a bar is visible). */
export function geographyBars(rows: readonly GeographyRowInput[]): GeographyBar[] {
  const max = rows.reduce((m, r) => Math.max(m, r.amountCents), 0);
  return rows.map((row) => ({
    ...row,
    amountLabel: formatEur(row.amountCents),
    widthPercent: max <= 0 ? '0%' : `${Math.max(2, Math.round((row.amountCents / max) * 100))}%`,
  }));
}
