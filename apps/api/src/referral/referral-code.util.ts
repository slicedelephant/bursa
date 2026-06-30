// Pure referral/advocate share-code logic (E15). No NestJS, no Prisma, no I/O.
// Mirrors the E8 onboarding-token pattern: a code is high-entropy random, the raw
// code is shown once, and only its SHA-256 hash is ever needed to validate an
// inbound code. `bytes` is injectable so the module is deterministic and unit-
// testable. Returns new values, never mutates its inputs.

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export type CodeStatus = 'ACTIVE' | 'REVOKED';

export interface ReferralCodeRecord {
  readonly codeHash: string;
  readonly status?: CodeStatus;
}

export interface CreatedReferralCode {
  /** Raw code — embedded in the shareable link. Shown once for advocate invites. */
  readonly code: string;
  /** SHA-256 hash of the code — this is what gets persisted/validated against. */
  readonly codeHash: string;
}

export type CodeInvalidReason = 'malformed' | 'mismatch' | 'revoked';

export interface CodeValidationResult {
  readonly valid: boolean;
  readonly reason?: CodeInvalidReason;
}

export interface CreateCodeOptions {
  /** Injectable random source for deterministic tests. */
  readonly bytes?: () => Buffer;
}

const CODE_BYTES = 12; // 96 bits — short enough to share, long enough to be unguessable.

/** Stable SHA-256 hex digest used for both generation and lookup. */
export function hashReferralCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function createReferralCode(
  options: CreateCodeOptions = {},
): CreatedReferralCode {
  const source = options.bytes ? options.bytes() : randomBytes(CODE_BYTES);
  const code = source.toString('hex');
  return { code, codeHash: hashReferralCode(code) };
}

/**
 * Validates a presented raw code against a stored record. Order is intentional:
 * hash first (timing-safe) so we never leak existence, then revoked status.
 */
export function validateReferralCode(
  record: ReferralCodeRecord | null | undefined,
  rawCode: string,
): CodeValidationResult {
  if (!record || typeof rawCode !== 'string' || rawCode.length === 0) {
    return { valid: false, reason: 'malformed' };
  }
  if (!timingSafeEqualHex(hashReferralCode(rawCode), record.codeHash)) {
    return { valid: false, reason: 'mismatch' };
  }
  if (record.status === 'REVOKED') {
    return { valid: false, reason: 'revoked' };
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
