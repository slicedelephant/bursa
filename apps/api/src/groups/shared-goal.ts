/**
 * E18 Groups — pure shared-goal aggregator. The combined progress of a group is
 * the sum of its parts against the shared goal: for a COHORT the parts are the
 * sub-campaigns' raisedCents; for a GIVING_CIRCLE they are the members'
 * contributions. Computed on read (derived state never drifts). No I/O, no
 * mutation; returns a new value. Money-free: this only projects amounts already
 * recorded elsewhere — funds still flow to the school.
 */

export interface GoalPart {
  readonly valueCents: number;
}

export interface SharedGoalInput {
  readonly parts: ReadonlyArray<GoalPart>;
  readonly goalCents: number;
}

export interface SharedGoalProgress {
  readonly raisedCents: number;
  readonly goalCents: number;
  /** Integer percent of the goal reached, capped at 100. 0 when goal is 0. */
  readonly percent: number;
  /** Cents still needed to reach the goal (never negative). */
  readonly remainingCents: number;
}

export function computeSharedGoal(input: SharedGoalInput): SharedGoalProgress {
  const raisedCents = input.parts.reduce(
    (sum, part) => sum + Math.max(0, part.valueCents),
    0,
  );
  const goalCents = Math.max(0, input.goalCents);
  const percent =
    goalCents === 0
      ? 0
      : Math.min(100, Math.floor((raisedCents / goalCents) * 100));
  const remainingCents = Math.max(0, goalCents - raisedCents);
  return { raisedCents, goalCents, percent, remainingCents };
}
