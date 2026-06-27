/**
 * Pure over-funding split — no I/O. The amount that counts toward the goal is
 * capped at the remaining gap; any excess (plus an explicit base tip) becomes a
 * tip that does not move the goal. Returns a new object; never mutates inputs.
 */
export interface ContributionSplit {
  readonly amountToGoal: number;
  readonly tip: number;
}

export function splitContribution(
  goalCents: number,
  raisedCents: number,
  amountCents: number,
  baseTipCents = 0,
): ContributionSplit {
  const remaining = Math.max(0, goalCents - raisedCents);
  if (amountCents > remaining) {
    return {
      amountToGoal: remaining,
      tip: baseTipCents + (amountCents - remaining),
    };
  }
  return { amountToGoal: amountCents, tip: baseTipCents };
}
