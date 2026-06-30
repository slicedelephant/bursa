// Pure presentation helpers for the public per-school transparency page (E12).
// Money/percentage formatting, headline stat tiles and donor-geography bars. No
// Angular, no I/O; returns new values only. Only aggregates are shown — never any
// individual donor.

import { TransparencyView } from '../../core/models';

export function formatEur(cents: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(cents) / 100);
}

export interface StatTile {
  readonly label: string;
  readonly value: string;
}

export function statTiles(data: TransparencyView): StatTile[] {
  return [
    { label: 'Total raised', value: formatEur(data.totalRaisedCents) },
    { label: 'Paid to the school', value: formatEur(data.totalPaidOutCents) },
    { label: 'Students supported', value: String(data.studentsSupported) },
    { label: 'Average donation', value: formatEur(data.avgDonationCents) },
  ];
}

/** Share of total raised that has reached the school, 0-100 (0 when nothing raised). */
export function paidOutPercent(data: TransparencyView): number {
  if (data.totalRaisedCents <= 0) return 0;
  return Math.min(100, Math.round((data.totalPaidOutCents / data.totalRaisedCents) * 100));
}

export interface GeographyBar {
  readonly country: string;
  readonly donationCount: number;
  readonly amountLabel: string;
  readonly widthPercent: string;
}

/** Bars scaled against the largest country amount (min 2% so a bar is visible). */
export function geographyBars(
  rows: readonly {
    country: string;
    donationCount: number;
    amountCents: number;
  }[],
): GeographyBar[] {
  const max = rows.reduce((m, r) => Math.max(m, r.amountCents), 0);
  return rows.map((row) => ({
    country: row.country,
    donationCount: row.donationCount,
    amountLabel: formatEur(row.amountCents),
    widthPercent: max <= 0 ? '0%' : `${Math.max(2, Math.round((row.amountCents / max) * 100))}%`,
  }));
}
