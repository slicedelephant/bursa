/**
 * E19 — Scholarship Program Manager: pure program-cycle / renewal logic.
 *
 * Plans the next cycle of a recurring program (year + 1), carrying forward the
 * form schema and resetting per-cycle counters. `now` is injected. No I/O;
 * returns new objects, never mutates inputs.
 */

export interface CycleState {
  readonly year: number;
  readonly budgetCents: number;
  readonly slots: number;
  readonly awardCents: number;
}

export interface RenewalInput {
  readonly cycle: CycleState;
  readonly now: Date;
  readonly budgetCents?: number;
  readonly slots?: number;
  readonly awardCents?: number;
  readonly deadlineMonths?: number; // months from now for the new deadline
}

export interface RenewalPlan {
  readonly year: number;
  readonly budgetCents: number;
  readonly slots: number;
  readonly awardCents: number;
  readonly deadline: Date | null;
  readonly copyFormSchema: boolean;
}

/**
 * Produces the plan for the following year's cycle. Overrides default to the
 * previous cycle's values so a bare renewal simply repeats last year's config.
 */
export function planRenewal(input: RenewalInput): RenewalPlan {
  const nextYear = input.cycle.year + 1;
  const deadline =
    input.deadlineMonths != null
      ? new Date(
          Date.UTC(
            input.now.getUTCFullYear(),
            input.now.getUTCMonth() + input.deadlineMonths,
            input.now.getUTCDate(),
          ),
        )
      : null;

  return {
    year: nextYear,
    budgetCents: input.budgetCents ?? input.cycle.budgetCents,
    slots: input.slots ?? input.cycle.slots,
    awardCents: input.awardCents ?? input.cycle.awardCents,
    deadline,
    copyFormSchema: true,
  };
}
