/**
 * E12 Reconciliation — pure tax-report formatter. Produces a prototype-grade tax
 * report for a school's payouts in one of two regimes derived from the school's
 * country: EU → SEPA documentation (IBAN masked), otherwise US → 1099-MISC-style
 * lines. No I/O, no mutation (Constitution IV).
 *
 * NOT a legally certified tax document — see the spec's Out of Scope. This is an
 * illustrative, exportable representation only.
 */

const EU_COUNTRIES = new Set([
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'BE',
  'AT',
  'IE',
  'PT',
  'FI',
  'GR',
  'LU',
  'SK',
  'SI',
  'EE',
  'LV',
  'LT',
  'CY',
  'MT',
  'PL',
  'CZ',
  'HU',
  'RO',
  'BG',
  'HR',
  'DK',
  'SE',
]);

export type TaxRegime = 'US_1099' | 'EU_SEPA';

export interface TaxPayoutInput {
  readonly payoutId: string;
  readonly campaignTitle: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly sentAt: Date | string | null;
}

export interface TaxSchoolInput {
  readonly schoolId: string;
  readonly name: string;
  readonly country: string;
  /** Full IBAN; only the masked tail appears in the report. */
  readonly iban?: string | null;
  readonly taxId?: string | null;
}

export interface TaxReportLine {
  readonly payoutId: string;
  readonly date: string;
  readonly description: string;
  readonly amountCents: number;
  /** 1099 box (US) or SEPA reference label (EU). */
  readonly classification: string;
}

export interface TaxReport {
  readonly regime: TaxRegime;
  readonly payerName: string;
  readonly recipientName: string;
  readonly recipientTaxId: string;
  readonly recipientAccount: string;
  readonly totalCents: number;
  readonly lines: readonly TaxReportLine[];
}

const PAYER_NAME = 'Bursa Giving Platform';

export function regimeForCountry(country: string): TaxRegime {
  return EU_COUNTRIES.has(country.trim().toUpperCase()) ? 'EU_SEPA' : 'US_1099';
}

export function maskIban(iban?: string | null): string {
  if (!iban) return 'N/A';
  const trimmed = iban.replace(/\s+/g, '');
  return trimmed.length <= 4 ? '****' : `**** ${trimmed.slice(-4)}`;
}

function isoDate(value: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

/** Build the tax report for a school's payouts. */
export function buildTaxReport(
  school: TaxSchoolInput,
  payouts: readonly TaxPayoutInput[],
): TaxReport {
  const regime = regimeForCountry(school.country);
  const classification =
    regime === 'US_1099' ? '1099-MISC Box 3' : 'SEPA credit transfer';

  const lines: TaxReportLine[] = payouts.map((p) => ({
    payoutId: p.payoutId,
    date: isoDate(p.sentAt),
    description: `Tuition disbursement — ${p.campaignTitle}`,
    amountCents: p.amountCents,
    classification,
  }));

  const totalCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);

  return {
    regime,
    payerName: PAYER_NAME,
    recipientName: school.name,
    recipientTaxId: school.taxId ?? 'N/A',
    recipientAccount: maskIban(school.iban),
    totalCents,
    lines,
  };
}

function eur(cents: number): string {
  return (cents / 100).toFixed(2);
}

function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialise the tax report to a CSV (header block + line rows). */
export function taxReportToCsv(report: TaxReport): string {
  const header = [
    `Regime,${report.regime}`,
    `Payer,${cell(report.payerName)}`,
    `Recipient,${cell(report.recipientName)}`,
    `Recipient Tax ID,${cell(report.recipientTaxId)}`,
    `Recipient Account,${cell(report.recipientAccount)}`,
    `Total (${'EUR'}),${eur(report.totalCents)}`,
    '',
    'Payout,Date,Description,Amount,Classification',
  ];
  const rows = report.lines.map((l) =>
    [
      cell(l.payoutId),
      l.date,
      cell(l.description),
      eur(l.amountCents),
      cell(l.classification),
    ].join(','),
  );
  return [...header, ...rows].join('\n') + '\n';
}
