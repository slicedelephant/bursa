// Pure presentation helpers for the funnel chart. No Angular, no I/O; returns new
// values, never mutates. The bar width uses the conversion vs. the first step so
// the visual matches the drop-off the operator cares about.

import { FunnelReport } from '../../../core/models';

export interface FunnelBar {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly conversionPct: number;
  readonly dropOffPct: number;
  /** CSS width for the bar, e.g. "40%". */
  readonly widthPercent: string;
  /** True for steps that lost more than a third vs. the previous step. */
  readonly highDropOff: boolean;
}

export const HIGH_DROP_OFF_PCT = 33;

export function funnelBars(report: FunnelReport): FunnelBar[] {
  return report.steps.map((step) => ({
    key: step.key,
    label: step.label,
    count: step.count,
    conversionPct: step.conversionPct,
    dropOffPct: step.dropOffPct,
    widthPercent: `${Math.max(2, Math.min(100, step.conversionPct))}%`,
    highDropOff: step.dropOffPct >= HIGH_DROP_OFF_PCT,
  }));
}

export function overallLabel(report: FunnelReport): string {
  return `${report.overallConversionPct}% overall conversion`;
}
