/**
 * E9 Trust-and-Safety — pure card-testing pattern detector.
 *
 * Card testing shows up as a burst of authorisation attempts (often many
 * failures) in a short window. This deterministic heuristic counts failed
 * attempts and rapid attempts inside an injected window and emits a partial
 * {score, reasons} consumed by `aggregateFraudScore`. No I/O, no mutation.
 */

export interface CardAttempt {
  /** Donation/charge status; anything other than SUCCEEDED counts as failed. */
  readonly status: string;
  readonly createdAt: Date | number;
}

export interface CardTestingResult {
  readonly flagged: boolean;
  readonly score: number;
  readonly reasons: string[];
}

export interface CardTestingOptions {
  /** Trailing window for "rapid" attempts (default 10 minutes). */
  readonly windowMs?: number;
  /** Failed attempts at/above this count flag on their own (default 3). */
  readonly failedThreshold?: number;
  /** Rapid attempts at/above this count contribute (default 5). */
  readonly rapidThreshold?: number;
}

const DEFAULT_WINDOW_MS = 10 * 60_000;
const FAILED = (status: string): boolean => status.toUpperCase() !== 'SUCCEEDED';

function toMillis(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

/**
 * Scores a sequence of recent card attempts for a single donor/instrument.
 * `now` is injected; defaults to the latest attempt timestamp so the detector
 * is deterministic even without a clock.
 */
export function detectCardTesting(
  attempts: readonly CardAttempt[],
  now?: Date | number,
  options: CardTestingOptions = {},
): CardTestingResult {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const failedThreshold = options.failedThreshold ?? 3;
  const rapidThreshold = options.rapidThreshold ?? 5;

  if (attempts.length === 0) {
    return { flagged: false, score: 0, reasons: [] };
  }

  const end =
    now !== undefined
      ? toMillis(now)
      : Math.max(...attempts.map((a) => toMillis(a.createdAt)));
  const start = end - windowMs;

  const inWindow = attempts.filter((a) => {
    const t = toMillis(a.createdAt);
    return t >= start && t <= end;
  });
  const failedCount = inWindow.filter((a) => FAILED(a.status)).length;
  const rapidCount = inWindow.length;
  const failureRatio = rapidCount === 0 ? 0 : failedCount / rapidCount;

  const reasons: string[] = [];
  let score = 0;

  if (failedCount >= failedThreshold) {
    score += 20 + Math.min(failedCount - failedThreshold, 4) * 10;
    reasons.push(`failed_attempts:${failedCount}`);
  }
  if (rapidCount >= rapidThreshold) {
    score += 20;
    reasons.push(`rapid_attempts:${rapidCount}`);
  }
  if (rapidCount >= 3 && failureRatio >= 0.5) {
    score += 15;
    reasons.push(`high_failure_ratio:${failureRatio.toFixed(2)}`);
  }

  const flagged = reasons.length > 0;
  return { flagged, score, reasons };
}
