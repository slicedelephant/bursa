import { EsgMetrics, InvoiceDocType, InvoiceStatus } from '../../core/models';

/**
 * Pure presentation helpers for the corporate ESG dashboard + invoices. No I/O;
 * returns new values, never mutates inputs.
 */
export interface EsgTile {
  readonly key: keyof EsgMetrics;
  readonly label: string;
  readonly value: number;
  readonly money?: boolean;
}

export function esgTiles(metrics: EsgMetrics): EsgTile[] {
  return [
    { key: 'studentsSupported', label: 'Students supported', value: metrics.studentsSupported },
    { key: 'countriesReached', label: 'Countries reached', value: metrics.countriesReached },
    { key: 'schoolsSupported', label: 'Schools supported', value: metrics.schoolsSupported },
    {
      key: 'totalCommittedCents',
      label: 'Total committed',
      value: metrics.totalCommittedCents,
      money: true,
    },
    { key: 'fullScholarships', label: 'Full scholarships', value: metrics.fullScholarships },
    { key: 'namedScholarships', label: 'Named scholarships', value: metrics.namedScholarships },
  ];
}

export function documentTypeLabel(type: InvoiceDocType): string {
  return type === 'SPONSORING' ? 'Sponsoring invoice (incl. 19% VAT)' : 'Donation receipt (no VAT)';
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PENDING':
      return 'Committed — awaiting SEPA settlement';
    default:
      return 'Issued';
  }
}
