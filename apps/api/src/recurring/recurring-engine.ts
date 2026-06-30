/**
 * Pure scheduling logic for SIMULATED recurring pledges — no I/O, no billing.
 * The actual charge runs through the PaymentProvider in the service; this module
 * only decides what is due and how to advance the schedule. Calendar month math
 * clamps to the last valid day (e.g. Jan 31 -> Feb 28). Returns new values;
 * never mutates inputs.
 */
export interface RecurringLike {
  readonly status: string; // 'ACTIVE' | 'PAUSED' | 'CANCELLED'
  readonly nextRunAt: Date;
}

export function addMonth(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const daysInTarget = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month + 1,
      Math.min(day, daysInTarget),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    ),
  );
}

export function isDue(pledge: RecurringLike, now: Date): boolean {
  return (
    pledge.status === 'ACTIVE' && pledge.nextRunAt.getTime() <= now.getTime()
  );
}

export function duePledges<T extends RecurringLike>(
  pledges: readonly T[],
  now: Date,
): T[] {
  return pledges.filter((p) => isDue(p, now));
}

export interface RecurringAdvance {
  readonly chargesCount: number;
  readonly totalChargedCents: number;
  readonly lastChargedAt: Date;
  readonly nextRunAt: Date;
}

export function advance(
  pledge: { chargesCount: number; totalChargedCents: number },
  chargedCents: number,
  now: Date,
): RecurringAdvance {
  return {
    chargesCount: pledge.chargesCount + 1,
    totalChargedCents: pledge.totalChargedCents + chargedCents,
    lastChargedAt: now,
    nextRunAt: addMonth(now),
  };
}
