/**
 * E19 — Scholarship Program Manager: pure application-token logic.
 *
 * Mirrors the E8 onboarding-token / E14 auditor-token pattern: only the SHA-256
 * hash of a token is ever stored; the raw token is shown once and embedded in
 * the public /apply/:token and status links. `now` and the random source are
 * injectable so the module is deterministic and unit-testable. No I/O, no
 * mutation (Constitution IV).
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export interface ApplicationTokenRecord {
  readonly tokenHash: string;
  readonly expiresAt?: Date | null;
  readonly revokedAt?: Date | null;
}

export interface CreatedApplicationToken {
  /** Raw token — returned exactly once, embedded in the apply link. */
  readonly token: string;
  /** SHA-256 hash of the token — this is what gets persisted. */
  readonly tokenHash: string;
}

const TOKEN_BYTES = 24;

/** Stable SHA-256 hex digest used for both generation and lookup. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generate a fresh apply token; injectable byte source for deterministic tests. */
export function createApplicationToken(
  bytes: () => Buffer = () => randomBytes(TOKEN_BYTES),
): CreatedApplicationToken {
  const token = bytes().toString('hex');
  return { token, tokenHash: hashToken(token) };
}

/**
 * A token is active when it is not revoked and, if an expiry is set, that expiry
 * lies in the future. Null expiry means the apply link does not expire.
 */
export function isTokenActive(
  record: ApplicationTokenRecord,
  now: Date = new Date(),
): boolean {
  if (record.revokedAt) {
    return false;
  }
  if (record.expiresAt != null && record.expiresAt.getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

/** Timing-safe comparison of a presented raw token against a stored hash. */
export function tokenMatches(rawToken: string, tokenHash: string): boolean {
  if (typeof rawToken !== 'string' || rawToken.length === 0) {
    return false;
  }
  const a = Buffer.from(hashToken(rawToken), 'hex');
  const b = Buffer.from(tokenHash, 'hex');
  if (a.length === 0 || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
