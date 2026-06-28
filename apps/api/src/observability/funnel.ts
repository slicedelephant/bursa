import { FunnelStepDef } from './funnel-steps';

/**
 * Pure funnel aggregation. Given a count per step key and the ordered step
 * definitions, computes for each step the count, the conversion vs. the first
 * step and the drop-off vs. the previous step. Returns new values; no mutation.
 */

export interface FunnelStepResult {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  /** Share of the first step's count that reached this step (0-100). */
  readonly conversionPct: number;
  /** Share lost vs. the previous step (0-100); 0 for the first step. */
  readonly dropOffPct: number;
}

export interface FunnelReport {
  readonly steps: readonly FunnelStepResult[];
  /** Last step count as a share of the first step count (0-100). */
  readonly overallConversionPct: number;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function buildFunnel(
  counts: Readonly<Record<string, number>>,
  steps: readonly FunnelStepDef[],
): FunnelReport {
  const first = steps.length > 0 ? counts[steps[0].key] ?? 0 : 0;

  const results: FunnelStepResult[] = steps.map((step, index) => {
    const count = counts[step.key] ?? 0;
    const prev = index === 0 ? count : counts[steps[index - 1].key] ?? 0;
    return {
      key: step.key,
      label: step.label,
      count,
      conversionPct: pct(count, first),
      dropOffPct: index === 0 ? 0 : Math.max(0, Math.round((pct(prev - count, prev)) * 10) / 10),
    };
  });

  const last = steps.length > 0 ? counts[steps[steps.length - 1].key] ?? 0 : 0;
  return { steps: results, overallConversionPct: pct(last, first) };
}
