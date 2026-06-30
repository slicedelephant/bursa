/**
 * E17 — update-read streak. A thin wrapper that feeds the feed-read timestamps
 * into the E16 monthly-streak primitive (`computeMonthlyStreak`) and names the
 * result the "update-read streak". There is no second streak algorithm: E16
 * built the core donation-free (it only knows timestamps + an injected
 * reference date), exactly for reuse like this. Deterministic (reference date
 * injected); no I/O; never mutates inputs.
 */

import { StreakState, computeMonthlyStreak } from '../gamification/streak.util';

export function computeReadStreak(
  readTimestamps: ReadonlyArray<Date | string>,
  referenceDate: Date | string,
): StreakState {
  return computeMonthlyStreak(readTimestamps, referenceDate);
}
