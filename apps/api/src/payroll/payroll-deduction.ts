/**
 * E21 Payroll-HRIS — pure payroll-deduction calculator.
 *
 * Computes the employee's payroll deduction (their own gift, taken from salary),
 * minor-unit safe (integer cents), with an optional pre-tax reduction modelled as
 * a simple percentage saving. No I/O, no mutation; never negative, never above
 * the gross contribution. NOTE: pre-tax here is a prototype percentage, NOT a real
 * payroll-tax engine (see Out of Scope).
 */

/** Scale of a pre-tax percentage: 25 = 25% tax saving. */
export const PRETAX_SCALE = 100;

export interface DeductionComputation {
  /** The gross contribution the employee committed (integer cents). */
  readonly grossCents: number;
  /** The net cost to the employee after a pre-tax saving (integer cents). */
  readonly netCents: number;
  /** The pre-tax saving applied (grossCents − netCents). */
  readonly taxSavingCents: number;
  readonly preTax: boolean;
}

/**
 * Compute a payroll deduction. `contributionCents` is the employee's chosen gift.
 * When `preTax` is set, a `taxRatePercent` saving is applied (floored to whole
 * cents), lowering the net cost to the employee. The gross gift to the campaign
 * is unchanged — only the employee's out-of-pocket net differs.
 */
export function computeDeduction(input: {
  contributionCents: number;
  preTax?: boolean;
  taxRatePercent?: number;
}): DeductionComputation {
  const grossCents = Math.max(0, Math.floor(input.contributionCents));
  const preTax = !!input.preTax;
  const rate = clampPercent(input.taxRatePercent ?? 0);

  const taxSavingCents = preTax
    ? Math.floor((grossCents * rate) / PRETAX_SCALE)
    : 0;
  const netCents = grossCents - taxSavingCents;

  return { grossCents, netCents, taxSavingCents, preTax };
}

/** Clamp a percentage into [0, 100]. */
function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(100, Math.floor(percent)));
}
