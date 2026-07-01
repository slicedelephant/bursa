/**
 * E21 Payroll-HRIS — pure payroll-cycle scheduler decision.
 *
 * Given a payroll cycle and an injected `now`, decide whether a payroll deduction
 * is due in the current period and when the next one falls. Deterministic: `now`
 * is always injected, never read from the clock inside the logic.
 */

export type PayrollCycle = 'WEEKLY' | 'BIWEEKLY' | 'SEMIMONTHLY' | 'MONTHLY';

/** Number of days between deductions for each cycle (SEMIMONTHLY ≈ twice a month). */
const CYCLE_DAYS: Record<PayrollCycle, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  SEMIMONTHLY: 15,
  MONTHLY: 30,
};

export interface CycleDecision {
  /** True when a deduction is due at/after `now` given the last run. */
  readonly due: boolean;
  /** ISO date of the next deduction after `now`. */
  readonly nextRunAt: string;
  readonly cycleDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two instants (floored, never negative). */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

/**
 * Decide whether a deduction is due. A deduction is due when at least one full
 * cycle has elapsed since `lastRunAt` (or when there was never a run). The next
 * run is scheduled one cycle after the later of `now` and `lastRunAt`.
 */
export function decidePayrollCycle(input: {
  cycle: PayrollCycle;
  now: Date;
  lastRunAt?: Date | null;
}): CycleDecision {
  const cycleDays = CYCLE_DAYS[input.cycle];
  const due = !input.lastRunAt
    ? true
    : daysBetween(input.lastRunAt, input.now) >= cycleDays;

  const anchor =
    input.lastRunAt && input.lastRunAt.getTime() > input.now.getTime()
      ? input.lastRunAt
      : input.now;
  const nextRunAt = new Date(anchor.getTime() + cycleDays * DAY_MS);

  return { due, nextRunAt: nextRunAt.toISOString(), cycleDays };
}
