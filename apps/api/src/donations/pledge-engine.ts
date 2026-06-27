/**
 * Pure All-or-Nothing pledge logic — no I/O, fully unit-tested.
 *
 * Invariant (Constitution II / payments-design §4): between PLEDGED and
 * CAPTURED no money moves. A pledge counts toward the goal immediately, but is
 * only charged once the goal is reached. If the goal is missed, pledges expire
 * uncharged — nothing is ever debited.
 */

export type PledgeOutcome = 'PLEDGED' | 'CAPTURED';

export interface PledgeLike {
  readonly id: string;
  readonly amountCents: number;
  readonly pledgeRef: string | null;
}

export interface CaptureSummary {
  readonly capturedIds: readonly string[];
  readonly failedIds: readonly string[];
  readonly capturedCents: number;
}

/** A campaign is goal-reached once total pledged/raised meets or exceeds the goal. */
export function isGoalReached(raisedCents: number, goalCents: number): boolean {
  return goalCents > 0 && raisedCents >= goalCents;
}

/** Cents still needed to reach the goal (never negative). */
export function remainingCents(raisedCents: number, goalCents: number): number {
  return Math.max(0, goalCents - raisedCents);
}

/**
 * The donation status a fresh card pledge takes: it stays PLEDGED until the
 * goal is reached, at which point it is captured.
 */
export function pledgeOutcome(raisedAfter: number, goalCents: number): PledgeOutcome {
  return isGoalReached(raisedAfter, goalCents) ? 'CAPTURED' : 'PLEDGED';
}

/**
 * Summarise the result of capturing a batch of pledges. `capture` returns the
 * provider reference on success or null on failure (e.g. SCA re-auth needed).
 */
export function summarizeCapture(
  pledges: readonly PledgeLike[],
  capture: (p: PledgeLike) => string | null,
): CaptureSummary {
  return pledges.reduce<CaptureSummary>(
    (acc, p) => {
      const ref = capture(p);
      if (ref) {
        return {
          capturedIds: [...acc.capturedIds, p.id],
          failedIds: acc.failedIds,
          capturedCents: acc.capturedCents + p.amountCents,
        };
      }
      return {
        capturedIds: acc.capturedIds,
        failedIds: [...acc.failedIds, p.id],
        capturedCents: acc.capturedCents,
      };
    },
    { capturedIds: [], failedIds: [], capturedCents: 0 },
  );
}
