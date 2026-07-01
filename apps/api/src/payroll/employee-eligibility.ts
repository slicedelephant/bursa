/**
 * E21 Payroll-HRIS — pure employee-eligibility resolver.
 *
 * Decides whether a synced employee may participate in payroll giving, from their
 * salary band, pre-tax eligibility and the program state. No I/O, no mutation.
 */

export interface EmployeeEligibilityInput {
  readonly salaryBandCents: number;
  readonly preTaxEligible: boolean;
  /** The employee opted in (activated payroll giving). */
  readonly active: boolean;
  /** The payroll-giving program is active. */
  readonly programActive: boolean;
  /** Minimum salary band required to participate (0 = no floor). */
  readonly minSalaryBandCents?: number;
}

export type IneligibleReason =
  | 'PROGRAM_INACTIVE'
  | 'NOT_ACTIVATED'
  | 'BELOW_SALARY_FLOOR';

export interface EligibilityResult {
  readonly eligible: boolean;
  readonly reason?: IneligibleReason;
  readonly preTaxAllowed: boolean;
}

/**
 * Resolve eligibility. An employee is eligible when the program is active, they
 * have opted in, and their salary band meets the floor. Pre-tax giving is only
 * offered when the employee is flagged pre-tax eligible.
 */
export function resolveEligibility(
  input: EmployeeEligibilityInput,
): EligibilityResult {
  const preTaxAllowed = input.preTaxEligible;

  if (!input.programActive) {
    return { eligible: false, reason: 'PROGRAM_INACTIVE', preTaxAllowed };
  }
  if (!input.active) {
    return { eligible: false, reason: 'NOT_ACTIVATED', preTaxAllowed };
  }
  const floor = Math.max(0, input.minSalaryBandCents ?? 0);
  if (input.salaryBandCents < floor) {
    return { eligible: false, reason: 'BELOW_SALARY_FLOOR', preTaxAllowed };
  }
  return { eligible: true, preTaxAllowed };
}
