import { RecognitionKind, SponsorshipTier } from '@prisma/client';

/**
 * Pure ESG/CSR aggregation + CSV serialisation — no I/O. Feeds the sponsor's
 * in-app impact dashboard and its exports. Returns new values; never mutates.
 */
export interface EsgRow {
  readonly campaignTitle: string;
  readonly studentName: string;
  readonly studentCountry: string;
  readonly schoolName: string;
  readonly amountCents: number;
  readonly tier: SponsorshipTier;
  readonly scholarshipName: string | null;
  readonly fullTuition: boolean;
  readonly recognitionKind: RecognitionKind;
  readonly createdAt: Date | string;
}

export interface EsgMetrics {
  readonly studentsSupported: number;
  readonly countriesReached: number;
  readonly schoolsSupported: number;
  readonly totalCommittedCents: number;
  readonly fullScholarships: number;
  readonly namedScholarships: number;
}

export function computeEsgMetrics(rows: readonly EsgRow[]): EsgMetrics {
  return {
    studentsSupported: new Set(rows.map((r) => r.studentName)).size,
    countriesReached: new Set(rows.map((r) => r.studentCountry)).size,
    schoolsSupported: new Set(rows.map((r) => r.schoolName)).size,
    totalCommittedCents: rows.reduce((sum, r) => sum + r.amountCents, 0),
    fullScholarships: rows.filter((r) => r.fullTuition).length,
    namedScholarships: rows.filter((r) => !!r.scholarshipName).length,
  };
}

const CSV_HEADER = [
  'Campaign',
  'Student',
  'Country',
  'School',
  'Amount (EUR)',
  'Tier',
  'Scholarship',
  'Date',
];

function eur(cents: number): string {
  return (cents / 100).toFixed(2);
}

function isoDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

/** RFC-4180-ish escaping: wrap in quotes and double inner quotes when needed. */
function cell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: readonly EsgRow[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      [
        cell(r.campaignTitle),
        cell(r.studentName),
        cell(r.studentCountry),
        cell(r.schoolName),
        eur(r.amountCents),
        r.tier,
        cell(r.scholarshipName ?? ''),
        isoDate(r.createdAt),
      ].join(','),
    );
  }
  return lines.join('\n') + '\n';
}
