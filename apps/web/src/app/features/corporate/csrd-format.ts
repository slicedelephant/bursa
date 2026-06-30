import { CsrdMetric, ReportStandard } from '../../core/models';

/**
 * Pure presentation helpers for the CSRD report builder. No I/O; returns new
 * values, never mutates inputs.
 */

export interface StandardOption {
  readonly value: ReportStandard;
  readonly label: string;
}

export const REPORT_STANDARDS: readonly StandardOption[] = [
  { value: 'GRI_2024', label: 'GRI Standards 2024' },
  { value: 'CSRD_ESRS', label: 'CSRD / ESRS' },
  { value: 'SASB', label: 'SASB' },
  { value: 'UN_SDG', label: 'UN Sustainable Development Goals' },
];

export function reportStandardLabel(standard: ReportStandard): string {
  return REPORT_STANDARDS.find((s) => s.value === standard)?.label ?? standard;
}

/** Format a mapped metric's value with its unit (EUR gets a thousands separator). */
export function formatMetricValue(metric: CsrdMetric): string {
  if (metric.unit === 'EUR') {
    return `EUR ${metric.value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${metric.value} ${metric.unit}`;
}

/** Short hash preview for an annotation footnote (first 12 chars). */
export function shortHash(entryHash: string): string {
  return entryHash.length > 12 ? `${entryHash.slice(0, 12)}…` : entryHash;
}
