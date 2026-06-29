/**
 * E9 Trust-and-Safety — pure transaction-velocity tracker.
 *
 * Counts how many events fall inside a trailing time window ending at `now`.
 * The clock is injected (no `Date.now()` inside), so the >5-donations-in-1h rule
 * is fully deterministic and unit-testable. No I/O, no mutation.
 */

export const HOUR_MS = 3_600_000;
export const DEFAULT_VELOCITY_LIMIT = 5;

function toMillis(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

/**
 * Number of timestamps within `[now - windowMs, now]` (inclusive). Future
 * timestamps (after `now`) are ignored.
 */
export function countWithinWindow(
  timestamps: ReadonlyArray<Date | number>,
  now: Date | number,
  windowMs: number = HOUR_MS,
): number {
  const end = toMillis(now);
  const start = end - windowMs;
  return timestamps.reduce<number>((count, ts) => {
    const t = toMillis(ts);
    return t >= start && t <= end ? count + 1 : count;
  }, 0);
}

export interface VelocityResult {
  readonly count: number;
  readonly exceeded: boolean;
  readonly limit: number;
  readonly windowMs: number;
}

export interface VelocityOptions {
  readonly limit?: number;
  readonly windowMs?: number;
}

/**
 * Evaluates whether the event count in the trailing window exceeds the limit
 * (default: more than 5 in 1 hour).
 */
export function exceedsVelocity(
  timestamps: ReadonlyArray<Date | number>,
  now: Date | number,
  options: VelocityOptions = {},
): VelocityResult {
  const limit = options.limit ?? DEFAULT_VELOCITY_LIMIT;
  const windowMs = options.windowMs ?? HOUR_MS;
  const count = countWithinWindow(timestamps, now, windowMs);
  return { count, exceeded: count > limit, limit, windowMs };
}
