/**
 * E14 ESG/CSRD — pure audit-annotation + report-export composition. Builds the
 * footnotes that tie each reported figure back to concrete, immutable ledger
 * entries (entryHash / sequence / amount), and composes the CSV and PDF bodies via
 * the reused E5 utils (`buildSimplePdf`, CSV `cell` escaping). No I/O, no mutation
 * (Constitution IV).
 */

import { ReportStandard } from '@prisma/client';
import { buildSimplePdf } from '../corporate/pdf.util';
import { MappedMetric } from './esg-standard-mapper';
import { reportStandardLabel } from './esg-standard-mapper';

export interface SourceEntry {
  readonly sequence: number;
  readonly entryType: string;
  readonly amountCents: number;
  readonly reason: string;
  readonly entryHash: string;
}

export interface AuditAnnotation {
  readonly ref: number;
  readonly sequence: number;
  readonly entryType: string;
  readonly amountCents: number;
  readonly reason: string;
  readonly entryHash: string;
}

export interface ReportPeriod {
  readonly start: Date | string;
  readonly end: Date | string;
}

export interface EsgReportView {
  readonly standard: ReportStandard;
  readonly period: ReportPeriod;
  readonly metrics: readonly MappedMetric[];
  readonly annotations: readonly AuditAnnotation[];
}

/**
 * Number the source entries as audit annotations. The order is preserved so the
 * footnote refs are stable and reproducible.
 */
export function buildAnnotations(
  sources: ReadonlyArray<SourceEntry>,
): AuditAnnotation[] {
  return sources.map((s, i) => ({
    ref: i + 1,
    sequence: s.sequence,
    entryType: s.entryType,
    amountCents: s.amountCents,
    reason: s.reason,
    entryHash: s.entryHash,
  }));
}

function eur(cents: number): string {
  return (cents / 100).toFixed(2);
}

function isoDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

/** RFC-4180-ish CSV cell escaping (same line as corporate/esg.util.ts). */
function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Compose the CSV body: a metrics block, then an audit-annotation block. */
export function toReportCsv(view: EsgReportView): string {
  const lines: string[] = [];
  lines.push(`Standard,${cell(reportStandardLabel(view.standard))}`);
  lines.push(
    `Period,${isoDate(view.period.start)} to ${isoDate(view.period.end)}`,
  );
  lines.push('');
  lines.push('Code,Metric,Value,Unit,Note');
  for (const m of view.metrics) {
    lines.push(
      [
        cell(m.code),
        cell(m.label),
        String(m.value),
        cell(m.unit),
        cell(m.note),
      ].join(','),
    );
  }
  lines.push('');
  lines.push('Ref,Sequence,Type,Amount (EUR),Reason,Entry hash');
  for (const a of view.annotations) {
    lines.push(
      [
        String(a.ref),
        String(a.sequence),
        cell(a.entryType),
        eur(a.amountCents),
        cell(a.reason),
        cell(a.entryHash),
      ].join(','),
    );
  }
  return lines.join('\n') + '\n';
}

/** Compose the text lines for the PDF export (heading handled by buildSimplePdf). */
export function toReportPdfLines(view: EsgReportView): string[] {
  const lines: string[] = [];
  lines.push(`Standard: ${reportStandardLabel(view.standard)}`);
  lines.push(
    `Period: ${isoDate(view.period.start)} to ${isoDate(view.period.end)}`,
  );
  lines.push('');
  lines.push('Metrics');
  for (const m of view.metrics) {
    lines.push(`- ${m.code}: ${m.label} = ${m.value} ${m.unit}`);
    lines.push(`    ${m.note}`);
  }
  lines.push('');
  lines.push('Audit annotations (source ledger entries)');
  for (const a of view.annotations) {
    lines.push(
      `[${a.ref}] seq=${a.sequence} ${a.entryType} ${eur(a.amountCents)} EUR — ${a.entryHash}`,
    );
  }
  return lines;
}

/** Render the full report PDF via the reused E5 buildSimplePdf. */
export function toReportPdf(view: EsgReportView): string {
  return buildSimplePdf(
    `Bursa ESG / CSRD report — ${reportStandardLabel(view.standard)}`,
    toReportPdfLines(view),
  );
}
