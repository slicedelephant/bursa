import { GroupMode, GroupVisibility, SharedGoalProgress, StretchResult } from '../../core/models';

/** Pure presentation helpers for the groups engine. No I/O; return new strings. */

export function modeLabel(mode: GroupMode): string {
  return mode === 'COHORT' ? 'Cohort team' : 'Giving circle';
}

export function visibilityLabel(visibility: GroupVisibility): string {
  return visibility === 'PUBLIC' ? 'Public' : 'Private';
}

/** "83% of goal" style label for the shared progress bar. */
export function sharedGoalText(goal: SharedGoalProgress): string {
  return `${goal.percent}% of goal`;
}

/** Human EUR amount from integer cents (e.g. 250000 → "2,500"). */
export function euros(cents: number): string {
  return (Math.max(0, cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Stretch-goal status line — reflects the recognition-only unlock. */
export function stretchText(stretch: StretchResult): string {
  if (stretch.unlocked) {
    return `Stretch reward unlocked at ${stretch.thresholdPct}%!`;
  }
  return `€${euros(stretch.remainingToStretchCents)} to unlock the ${stretch.thresholdPct}% stretch reward`;
}
