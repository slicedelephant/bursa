// Pure one-time onboarding-link token logic (E8). No NestJS, no Prisma, no I/O.
// Only the SHA-256 hash of a token is ever stored; the raw token is shown once.
// `now` and the random source are injectable so the whole module is deterministic
// and unit-testable. Returns new values, never mutates its inputs.

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export interface OnboardingTokenRecord {
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly usedAt?: Date | null;
}

export interface CreatedOnboardingToken {
  /** Raw token — returned exactly once, embedded in the hosted onboarding link. */
  readonly token: string;
  /** SHA-256 hash of the token — this is what gets persisted. */
  readonly tokenHash: string;
  readonly expiresAt: Date;
}

export type TokenInvalidReason = 'malformed' | 'mismatch' | 'expired' | 'used';

export interface TokenValidationResult {
  readonly valid: boolean;
  readonly reason?: TokenInvalidReason;
}

export interface CreateTokenOptions {
  readonly now?: Date;
  readonly ttlMs?: number;
  /** Injectable random source for deterministic tests. */
  readonly bytes?: () => Buffer;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TOKEN_BYTES = 32;

/** Stable SHA-256 hex digest used for both generation and lookup. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createOnboardingToken(
  options: CreateTokenOptions = {},
): CreatedOnboardingToken {
  const now = options.now ?? new Date();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const source = options.bytes ? options.bytes() : randomBytes(TOKEN_BYTES);
  const token = source.toString('hex');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + ttlMs),
  };
}

/**
 * Validates a presented raw token against a stored record. Order of checks is
 * intentional: hash first (timing-safe) so we never leak existence, then used,
 * then expiry.
 */
export function validateOnboardingToken(
  record: OnboardingTokenRecord | null | undefined,
  rawToken: string,
  now: Date = new Date(),
): TokenValidationResult {
  if (!record || typeof rawToken !== 'string' || rawToken.length === 0) {
    return { valid: false, reason: 'malformed' };
  }
  if (!timingSafeEqualHex(hashToken(rawToken), record.tokenHash)) {
    return { valid: false, reason: 'mismatch' };
  }
  if (record.usedAt) {
    return { valid: false, reason: 'used' };
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
