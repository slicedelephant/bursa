/**
 * E21 Payroll-HRIS — firm-wide match rule applied on top of the E13 engine.
 *
 * This is a THIN adapter, NOT a second matching algorithm. It takes the company's
 * PayrollMatchRule (ratio ×100 + per-employee annual cap) plus how much a given
 * employee has already used this year, and delegates the actual money math to the
 * validated E13 pure cores (`computeMatch`, `remainingAnnualCents`). Integer minor
 * units; never negative, never over the per-employee cap.
 */

import { computeMatch, remainingAnnualCents } from '../matching/match-amount';

export interface PayrollMatchRuleInput {
  /** Employee's own contribution (their gift), integer cents. */
  readonly contributionCents: number;
  /** Company match ratio ×100 (100 = 1:1) — reuses E13 MATCH_RATIO_SCALE. */
  readonly matchRatio: number;
  /** Per-employee annual cap in cents. */
  readonly perEmployeeCapCents: number;
  /** Match cents this employee already committed this year. */
  readonly usedCents: number;
}

export interface PayrollMatchResult {
  /** The committed match in cents (E13 computeMatch, capped by the remaining cap). */
  readonly matchCents: number;
  /** The uncapped match before the per-employee cap applied. */
  readonly uncappedMatchCents: number;
  /** Remaining per-employee balance AFTER this match. */
  readonly remainingAfterCents: number;
  /** True when the per-employee cap reduced the match. */
  readonly capped: boolean;
  /** New total used for the employee this year (usedCents + matchCents). */
  readonly newUsedCents: number;
}

/**
 * Apply the firm-wide rule to one employee contribution. The remaining balance is
 * derived from the per-employee cap and prior usage (E13 `remainingAnnualCents`);
 * the match itself is the E13 `computeMatch`. No new arithmetic here.
 */
export function applyPayrollMatchRule(
  input: PayrollMatchRuleInput,
): PayrollMatchResult {
  const remaining = remainingAnnualCents(
    input.perEmployeeCapCents,
    input.usedCents,
  );
  const match = computeMatch(
    input.contributionCents,
    input.matchRatio,
    remaining,
  );

  return {
    matchCents: match.matchCents,
    uncappedMatchCents: match.uncappedMatchCents,
    remainingAfterCents: match.remainingAfterCents,
    capped: match.capped,
    newUsedCents: Math.max(0, Math.floor(input.usedCents)) + match.matchCents,
  };
}
