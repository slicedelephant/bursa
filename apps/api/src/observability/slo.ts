/**
 * Pure SLO + multi-window multi-burn-rate evaluation (Google SRE workbook).
 * No I/O, no mutation. Given good/total request counts over several time windows
 * and an availability objective, computes per-window SLI and burn rate and decides
 * whether a fast "page" or a slow "ticket" alert should fire.
 *
 * Burn rate = observed error rate / error budget fraction. A burn rate of 1 means
 * the budget would be exhausted exactly over the SLO period.
 */

export const PAGE_BURN_THRESHOLD = 14.4; // fast window (1h) + 5m short window
export const TICKET_BURN_THRESHOLD = 6; // slow window (6h) + 30m short window

export type SloAlert = 'none' | 'ticket' | 'page';

export interface SloWindowInput {
  /** 'fast' | 'fast_short' | 'slow' | 'slow_short'. */
  readonly label: string;
  readonly good: number;
  readonly total: number;
}

export interface SloWindow {
  readonly windowLabel: string;
  readonly sliPct: number;
  readonly burnRate: number;
  readonly budgetConsumedPct: number;
}

export interface SloReport {
  readonly objectivePct: number;
  readonly errorBudgetPct: number;
  readonly windows: readonly SloWindow[];
  readonly alert: SloAlert;
}

function round(value: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

function evaluateWindow(
  input: SloWindowInput,
  errorBudgetFraction: number,
): SloWindow {
  const errorRate = input.total > 0 ? 1 - input.good / input.total : 0;
  const sliPct =
    input.total > 0 ? round((input.good / input.total) * 100, 2) : 100;
  const burnRate =
    errorBudgetFraction > 0 ? round(errorRate / errorBudgetFraction, 2) : 0;
  const budgetConsumedPct = Math.min(100, round(burnRate * 100, 1));
  return { windowLabel: input.label, sliPct, burnRate, budgetConsumedPct };
}

function burnOf(windows: readonly SloWindow[], label: string): number | null {
  const w = windows.find((x) => x.windowLabel === label);
  return w ? w.burnRate : null;
}

function pairExceeds(
  windows: readonly SloWindow[],
  longLabel: string,
  shortLabel: string,
  threshold: number,
): boolean {
  const long = burnOf(windows, longLabel);
  const short = burnOf(windows, shortLabel);
  return (
    long !== null && short !== null && long >= threshold && short >= threshold
  );
}

export function evaluateSlo(
  windows: readonly SloWindowInput[],
  objectivePct = 99.9,
): SloReport {
  const errorBudgetFraction = 1 - objectivePct / 100;
  const evaluated = windows.map((w) => evaluateWindow(w, errorBudgetFraction));

  let alert: SloAlert = 'none';
  if (pairExceeds(evaluated, 'fast', 'fast_short', PAGE_BURN_THRESHOLD)) {
    alert = 'page';
  } else if (
    pairExceeds(evaluated, 'slow', 'slow_short', TICKET_BURN_THRESHOLD)
  ) {
    alert = 'ticket';
  }

  return {
    objectivePct,
    errorBudgetPct: round(errorBudgetFraction * 100, 3),
    windows: evaluated,
    alert,
  };
}
