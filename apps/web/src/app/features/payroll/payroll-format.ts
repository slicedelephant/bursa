import { PayrollCycle } from '../../core/models';

/**
 * E21 — pure formatting helpers for the payroll-giving UI. Money is integer minor
 * units (cents); these format for display without storing a float. No I/O; returns
 * new strings, never mutates inputs.
 */

const CYCLE_LABELS: Record<PayrollCycle, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every two weeks',
  SEMIMONTHLY: 'Twice a month',
  MONTHLY: 'Monthly',
};

/** Whole-EUR string for an integer cents amount (e.g. 80000 -> "€800"). */
export function eur(cents: number | null | undefined): string {
  return `€${Math.round((cents ?? 0) / 100)}`;
}

/** The human label for a payroll cycle. */
export function cycleLabel(cycle: PayrollCycle): string {
  return CYCLE_LABELS[cycle] ?? cycle;
}

/** "€400 of €500 match budget left" for an employee row. */
export function remainingLabel(remainingCents: number, capCents: number): string {
  return `${eur(remainingCents)} of ${eur(capCents)} match budget left`;
}

/** Percentage of the per-employee cap already used (0-100). */
export function usedPercent(remainingCents: number, capCents: number): number {
  if (!capCents || capCents <= 0) return 0;
  const used = Math.max(0, capCents - Math.max(0, remainingCents));
  return Math.max(0, Math.min(100, Math.round((used / capCents) * 100)));
}
