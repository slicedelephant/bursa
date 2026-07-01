/**
 * E19 — Scholarship Program Manager: pure impact-report composition.
 *
 * Turns the program outcome (this epic) + the E14 diversity aggregate into CSV
 * and PDF line arrays. The PDF string itself is rendered by the E5 `buildSimplePdf`
 * primitive (called by the service); here we only build the deterministic lines.
 * No I/O; returns new arrays, never mutates inputs.
 */

import { DiversityAggregate } from '../esg/diversity-aggregator';
import { ProgramOutcome } from './outcome-aggregator';

export interface ReportView {
  readonly programName: string;
  readonly cycleYear: number;
  readonly outcome: ProgramOutcome;
  readonly diversity: DiversityAggregate;
}

/** RFC-4180-ish escaping (mirrors the E5 corporate CSV util). */
function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Two-column "Metric,Value" CSV so the report opens cleanly in a spreadsheet. */
export function toReportCsv(view: ReportView): string {
  const rows: readonly [string, string][] = [
    ['Program', view.programName],
    ['Cycle', String(view.cycleYear)],
    ['Scholars total', String(view.outcome.total)],
    ['Enrolled', String(view.outcome.enrolled)],
    ['Graduated', String(view.outcome.graduated)],
    ['Working', String(view.outcome.working)],
    ['Withdrawn', String(view.outcome.withdrawn)],
    ['Alumni network', String(view.outcome.alumni)],
    ['Retention rate %', String(view.outcome.retentionRate)],
    ['Graduation rate %', String(view.outcome.graduationRate)],
    ['Female share %', String(view.diversity.femaleSharePct)],
    ['First-gen share %', String(view.diversity.firstGenSharePct)],
    ['Countries reached', String(view.diversity.countriesReached)],
  ];
  const lines = [
    'Metric,Value',
    ...rows.map(([k, v]) => `${cell(k)},${cell(v)}`),
  ];
  return lines.join('\n') + '\n';
}

/** Human-readable lines for the E5 `buildSimplePdf(title, lines)` primitive. */
export function toReportPdfLines(view: ReportView): string[] {
  return [
    `Cycle: ${view.cycleYear}`,
    '',
    'Scholar outcomes',
    `- Scholars total: ${view.outcome.total}`,
    `- Enrolled: ${view.outcome.enrolled}`,
    `- Graduated: ${view.outcome.graduated}`,
    `- Working: ${view.outcome.working}`,
    `- Withdrawn: ${view.outcome.withdrawn}`,
    `- Alumni network: ${view.outcome.alumni}`,
    `- Retention rate: ${view.outcome.retentionRate}%`,
    `- Graduation rate: ${view.outcome.graduationRate}%`,
    '',
    'Diversity (reused from E14 aggregator)',
    `- Female share: ${view.diversity.femaleSharePct}%`,
    `- First-generation share: ${view.diversity.firstGenSharePct}%`,
    `- Countries reached: ${view.diversity.countriesReached}`,
  ];
}

export function reportPdfTitle(view: ReportView): string {
  return `${view.programName} — Impact Report ${view.cycleYear}`;
}
