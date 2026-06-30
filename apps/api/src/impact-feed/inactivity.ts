/**
 * E17 — pure donor inactivity detector. From the last donation date and a
 * threshold in days it decides whether a gentle recurring-donation reminder is
 * due. Deterministic: `now` is INJECTED (no `Date.now()`), so it never flakes.
 * The reminder only links the EXISTING donate flow (1-tap) — this never writes
 * to a donation or payout, so money still goes to the school. No I/O; returns
 * new objects; never mutates inputs.
 */

export interface InactivityInput {
  readonly lastDonationAt: Date | string | null;
  readonly now: Date | string;
  readonly thresholdDays: number;
}

export interface InactivityResult {
  readonly inactive: boolean;
  readonly daysSince: number | null;
  readonly shouldRemind: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function detectInactivity(input: InactivityInput): InactivityResult {
  if (input.lastDonationAt === null) {
    // A donor who never gave is not "inactive" to nudge back — there is no streak
    // to revive, so we do not send the lapsed-donor reminder.
    return { inactive: false, daysSince: null, shouldRemind: false };
  }

  const now = toDate(input.now).getTime();
  const last = toDate(input.lastDonationAt).getTime();
  const daysSince = Math.floor((now - last) / DAY_MS);
  const inactive = daysSince >= input.thresholdDays;

  return { inactive, daysSince, shouldRemind: inactive };
}
