/**
 * E18 Groups — pure stretch-goal unlock decision. A cohort's stretch goal
 * unlocks once the combined progress reaches a threshold percent of the shared
 * goal (default 80%). Recognition-only: the unlock flips a display state, it is
 * NEVER a cash reward or payout — money stays bound to the school (Constitution
 * II). Deterministic, no I/O, no mutation; returns a new value.
 */

export const DEFAULT_STRETCH_THRESHOLD_PCT = 80;

export interface StretchInput {
  readonly raisedCents: number;
  readonly goalCents: number;
  /** Percent (1..100) of the goal at which the stretch reward unlocks. */
  readonly thresholdPct?: number;
}

export interface StretchResult {
  readonly unlocked: boolean;
  readonly thresholdPct: number;
  /** Cents that correspond to the threshold percent of the goal. */
  readonly thresholdCents: number;
  /** Integer percent of the goal reached (uncapped, so 120% is visible). */
  readonly percent: number;
  /** Cents still needed to unlock the stretch (never negative). */
  readonly remainingToStretchCents: number;
}

function clampThreshold(value?: number): number {
  if (value === undefined || Number.isNaN(value)) {
    return DEFAULT_STRETCH_THRESHOLD_PCT;
  }
  return Math.min(100, Math.max(1, Math.floor(value)));
}

export function decideStretchGoal(input: StretchInput): StretchResult {
  const thresholdPct = clampThreshold(input.thresholdPct);
  const goalCents = Math.max(0, input.goalCents);
  const raisedCents = Math.max(0, input.raisedCents);
  const thresholdCents = Math.ceil((goalCents * thresholdPct) / 100);
  const unlocked = goalCents > 0 && raisedCents >= thresholdCents;
  const percent =
    goalCents === 0 ? 0 : Math.floor((raisedCents / goalCents) * 100);
  const remainingToStretchCents = Math.max(0, thresholdCents - raisedCents);
  return {
    unlocked,
    thresholdPct,
    thresholdCents,
    percent,
    remainingToStretchCents,
  };
}
