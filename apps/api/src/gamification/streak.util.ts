/**
 * Pure monthly-streak calculator — no I/O, no Date.now(). A generic gamification
 * primitive: it knows nothing about donations, only a list of activity timestamps
 * and an injected reference date. Reused by the donor portfolio (E16) and, later,
 * by referral counts (E15) and group activity (E18). Returns new values; never
 * mutates the input.
 */

export interface StreakState {
  /** Consecutive calendar months ending at (or one month before) the reference. */
  readonly currentMonths: number;
  /** Longest consecutive month run ever observed in the timestamps. */
  readonly longestMonths: number;
  /** Whether the reference month itself already has activity. */
  readonly currentMonthCovered: boolean;
  /** Most recent active month as "YYYY-MM", or null when there is no activity. */
  readonly lastActiveMonth: string | null;
}

/** Zero-based month index since year 0, so consecutive months differ by exactly 1. */
function monthIndex(value: Date | string): number {
  const d = value instanceof Date ? value : new Date(value);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function monthKey(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function computeMonthlyStreak(
  timestamps: ReadonlyArray<Date | string>,
  referenceDate: Date | string,
): StreakState {
  if (timestamps.length === 0) {
    return {
      currentMonths: 0,
      longestMonths: 0,
      currentMonthCovered: false,
      lastActiveMonth: null,
    };
  }

  const months = [...new Set(timestamps.map(monthIndex))].sort((a, b) => a - b);
  const refMonth = monthIndex(referenceDate);

  // Longest consecutive run anywhere in the history.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < months.length; i += 1) {
    run = months[i] === months[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const activeSet = new Set(months);
  const currentMonthCovered = activeSet.has(refMonth);

  // The current streak counts back from the reference month. We allow a one-month
  // grace: if the reference month has no activity yet, the streak is anchored on
  // the previous month so it does not reset on the 1st of a new month.
  let anchor: number | null = null;
  if (activeSet.has(refMonth)) anchor = refMonth;
  else if (activeSet.has(refMonth - 1)) anchor = refMonth - 1;

  let current = 0;
  if (anchor !== null) {
    let cursor = anchor;
    while (activeSet.has(cursor)) {
      current += 1;
      cursor -= 1;
    }
  }

  return {
    currentMonths: current,
    longestMonths: longest,
    currentMonthCovered,
    lastActiveMonth: monthKey(months[months.length - 1]),
  };
}
