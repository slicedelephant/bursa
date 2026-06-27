// Pure goal / deadline maths for the All-or-Nothing campaign mechanic.
// No Angular, no I/O — trivially unit-tested and reused by the progress UI.

export type Milestone = 'funded' | 'final-push' | 'almost-there' | null;

export interface DeadlineInfo {
  /** Whole days until the deadline (negative once it has passed). */
  daysLeft: number;
  /** True when the deadline is in the past. */
  passed: boolean;
  /** True when the deadline is near (<= 7 days) and not yet passed. */
  urgent: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Cents still needed to reach the goal (never negative). */
export function remainingCents(raisedCents: number, goalCents: number): number {
  return Math.max(0, goalCents - raisedCents);
}

/** Progress toward the goal as a 0–100 integer percentage. */
export function percentToGoal(raisedCents: number, goalCents: number): number {
  if (goalCents <= 0) return 0;
  const pct = Math.round((raisedCents / goalCents) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Milestone trigger for the goal gradient: the 80% and 90% pushes are where, under
 * All-or-Nothing, the campaign is won or lost.
 */
export function milestone(percent: number): Milestone {
  if (percent >= 100) return 'funded';
  if (percent >= 90) return 'final-push';
  if (percent >= 80) return 'almost-there';
  return null;
}

/** Human label for a milestone, or null when none applies. */
export function milestoneLabel(percent: number): string | null {
  switch (milestone(percent)) {
    case 'funded':
      return 'Goal reached';
    case 'final-push':
      return 'Final push — 90% funded';
    case 'almost-there':
      return 'Almost there — 80% funded';
    default:
      return null;
  }
}

/** Days/urgency until the study-start deadline, or null when no deadline is set. */
export function deadlineInfo(
  deadline: string | Date | null | undefined,
  now: number = Date.now(),
): DeadlineInfo | null {
  if (!deadline) return null;
  const ts = deadline instanceof Date ? deadline.getTime() : Date.parse(deadline);
  if (Number.isNaN(ts)) return null;
  const daysLeft = Math.ceil((ts - now) / DAY_MS);
  const passed = ts < now;
  return { daysLeft, passed, urgent: !passed && daysLeft <= 7 };
}
