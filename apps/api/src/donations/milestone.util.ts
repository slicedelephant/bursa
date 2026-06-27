/**
 * Pure milestone detection — no I/O. Reports which funding thresholds were newly
 * crossed when a campaign's raised amount moved from `prev` to `next`. Used to
 * fire "you reached X%" / "goal reached" notifications exactly once per crossing.
 */
export const MILESTONES = [80, 90, 100] as const;
export type Milestone = (typeof MILESTONES)[number];

function pct(raisedCents: number, goalCents: number): number {
  return (raisedCents / goalCents) * 100;
}

export function crossedMilestones(
  prevRaisedCents: number,
  nextRaisedCents: number,
  goalCents: number,
): Milestone[] {
  if (goalCents <= 0) return [];
  const before = pct(prevRaisedCents, goalCents);
  const after = pct(nextRaisedCents, goalCents);
  return MILESTONES.filter((m) => before < m && after >= m);
}

export function isGoalMilestone(m: Milestone): boolean {
  return m === 100;
}
