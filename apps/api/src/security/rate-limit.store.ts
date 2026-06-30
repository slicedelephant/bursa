/**
 * In-memory fixed-window rate-limit counter. Pure logic with an explicit clock
 * (`now`) so it is fully deterministic and unit-testable. One process holds the
 * Map; this is intentionally per-instance (no Redis / external infra) — enough
 * to brake brute-force and card-testing on the prototype. Horizontal scaling
 * would swap this Map for a shared store behind the same interface.
 */

export interface RateLimitDecision {
  /** Whether the request is allowed (within the window's limit). */
  allowed: boolean;
  /** Configured maximum hits per window. */
  limit: number;
  /** Remaining hits in the current window (never negative). */
  remaining: number;
  /** Epoch millis when the current window resets. */
  resetAt: number;
  /** Seconds until reset (for the Retry-After header). */
  retryAfterSec: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  /**
   * Registers one hit for `key` and returns the decision. A fresh or expired
   * window starts a new bucket; otherwise the counter increments.
   */
  hit(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
  ): RateLimitDecision {
    const existing = this.buckets.get(key);
    const bucket =
      !existing || now >= existing.resetAt
        ? { count: 0, resetAt: now + windowMs }
        : existing;

    const count = bucket.count + 1;
    const next: Bucket = { count, resetAt: bucket.resetAt };
    this.buckets.set(key, next);

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const retryAfterSec = allowed
      ? 0
      : Math.ceil((bucket.resetAt - now) / 1000);

    return {
      allowed,
      limit,
      remaining,
      resetAt: bucket.resetAt,
      retryAfterSec,
    };
  }

  /** Drops expired buckets; safe to call periodically to bound memory. */
  prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }

  /** Test/maintenance helper: clears all buckets. */
  reset(): void {
    this.buckets.clear();
  }
}
