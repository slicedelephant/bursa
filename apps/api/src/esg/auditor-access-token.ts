/**
 * E14 ESG/CSRD — pure time-limited auditor-access token logic. Mirrors the E8
 * onboarding-token pattern: only the SHA-256 hash of a token is ever stored; the
 * raw token is shown once and embedded in the read-only audit-portal link. `now`
 * and the random source are injectable so the module is deterministic and
 * unit-testable. No I/O, no mutation (Constitution IV).
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export interface AuditorGrantRecord {
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt?: Date | null;
}

export interface CreatedAuditorToken {
  /** Raw token — returned exactly once, embedded in the audit-portal link. */
  readonly token: string;
  /** SHA-256 hash of the token — this is what gets persisted. */
  readonly tokenHash: string;
  readonly expiresAt: Date;
}

export type AuditorTokenInvalidReason =
  | 'malformed'
  | 'mismatch'
  | 'revoked'
  | 'expired';

export interface AuditorTokenValidationResult {
  readonly valid: boolean;
  readonly reason?: AuditorTokenInvalidReason;
}

export interface CreateAuditorTokenOptions {
  readonly now?: Date;
  readonly ttlMs?: number;
  /** Injectable random source for deterministic tests. */
  readonly bytes?: () => Buffer;
}

const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours (CFO/auditor user story)
export const MIN_TTL_MS = 1 * 60 * 60 * 1000; // 1 hour
export const MAX_TTL_MS = 168 * 60 * 60 * 1000; // 7 days
const TOKEN_BYTES = 32;

/** Stable SHA-256 hex digest used for both generation and lookup. */
export function hashAuditorToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Clamp a requested TTL (hours) into [MIN, MAX]; default 48h when undefined. */
export function resolveTtlMs(ttlHours?: number | null): number {
  if (typeof ttlHours !== 'number' || !Number.isFinite(ttlHours)) {
    return DEFAULT_TTL_MS;
  }
  const ms = ttlHours * 60 * 60 * 1000;
  return Math.min(Math.max(ms, MIN_TTL_MS), MAX_TTL_MS);
}

export function createAuditorToken(
  options: CreateAuditorTokenOptions = {},
): CreatedAuditorToken {
  const now = options.now ?? new Date();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const source = options.bytes ? options.bytes() : randomBytes(TOKEN_BYTES);
  const token = source.toString('hex');
  return {
    token,
    tokenHash: hashAuditorToken(token),
    expiresAt: new Date(now.getTime() + ttlMs),
  };
}

/**
 * Validate a presented raw token against a stored grant. Order of checks is
 * intentional: hash first (timing-safe, no existence leak), then revoked, then
 * expiry.
 */
export function validateAuditorToken(
  record: AuditorGrantRecord | null | undefined,
  rawToken: string,
  now: Date = new Date(),
): AuditorTokenValidationResult {
  if (!record || typeof rawToken !== 'string' || rawToken.length === 0) {
    return { valid: false, reason: 'malformed' };
  }
  if (!timingSafeEqualHex(hashAuditorToken(rawToken), record.tokenHash)) {
    return { valid: false, reason: 'mismatch' };
  }
  if (record.revokedAt) {
    return { valid: false, reason: 'revoked' };
  }
  if (record.expiresAt.getTime() <= now.getTime()) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
