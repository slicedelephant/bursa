// Pure presentation helpers for the SLO / burn-rate panel. No Angular, no I/O.

import { SloReport, SloWindow } from '../../../core/models';

export interface SloWindowRow {
  readonly label: string;
  readonly sliPct: number;
  readonly burnRate: number;
  readonly budgetConsumedPct: number;
  readonly burnClass: string;
}

const WINDOW_LABELS: Record<string, string> = {
  fast: 'Fast (1h)',
  fast_short: 'Fast short (5m)',
  slow: 'Slow (6h)',
  slow_short: 'Slow short (30m)',
};

export function burnClass(burnRate: number): string {
  if (burnRate >= 14.4) return 'text-brand-orange';
  if (burnRate >= 6) return 'text-amber-500';
  return 'text-brand-green';
}

export function windowRows(report: SloReport): SloWindowRow[] {
  return report.windows.map((w: SloWindow) => ({
    label: WINDOW_LABELS[w.windowLabel] ?? w.windowLabel,
    sliPct: w.sliPct,
    burnRate: w.burnRate,
    budgetConsumedPct: w.budgetConsumedPct,
    burnClass: burnClass(w.burnRate),
  }));
}

export function alertLabel(report: SloReport): string {
  switch (report.alert) {
    case 'page':
      return 'PAGE — fast burn, act now';
    case 'ticket':
      return 'Ticket — slow burn, investigate';
    default:
      return 'Healthy — within error budget';
  }
}

export function alertClass(report: SloReport): string {
  switch (report.alert) {
    case 'page':
      return 'bg-brand-orange/10 text-brand-orange ring-brand-orange/30';
    case 'ticket':
      return 'bg-amber-50 text-amber-700 ring-amber-300';
    default:
      return 'bg-brand-green/10 text-brand-green ring-brand-green/30';
  }
}

export function objectiveLabel(report: SloReport): string {
  return `Objective ${report.objectivePct}% · error budget ${report.errorBudgetPct}%`;
}
