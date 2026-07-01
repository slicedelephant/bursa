/**
 * E18 Groups — pure group-invite token logic. This REUSES the E15/E8 one-time-token
 * pattern (`referral-code.util`): a high-entropy raw token is shown once inside the
 * invite link, and only its SHA-256 hash is persisted. QR is the same URL — no extra
 * backend. `createGroupInvite` produces the token + hash + role; `decideInviteAcceptance`
 * validates a presented raw token timing-safe, then checks status, expiry (against an
 * injected `now`) and existing membership. No I/O, no mutation; returns new values.
 */

import {
  CreateCodeOptions,
  createReferralCode,
  validateReferralCode,
} from '../referral/referral-code.util';
import { GroupRole } from './membership';

export type GroupInviteStatus = 'ACTIVE' | 'REVOKED' | 'USED';

export interface CreatedGroupInvite {
  /** Raw token — embedded in the invite link/QR. Shown once. */
  readonly code: string;
  /** SHA-256 hash — this is what gets persisted and validated against. */
  readonly codeHash: string;
  readonly role: GroupRole;
  readonly expiresAt: Date | null;
}

export interface GroupInviteRecord {
  readonly codeHash: string;
  readonly status: GroupInviteStatus;
  readonly role: GroupRole;
  readonly expiresAt: Date | string | null;
}

export type InviteRejectReason =
  | 'malformed'
  | 'mismatch'
  | 'revoked'
  | 'used'
  | 'expired'
  | 'already_member';

export interface InviteAcceptance {
  readonly accept: boolean;
  readonly reason?: InviteRejectReason;
  /** The role the joiner receives when acceptance is allowed. */
  readonly role?: GroupRole;
}

export interface CreateInviteOptions extends CreateCodeOptions {
  readonly expiresAt?: Date | null;
}

export function createGroupInvite(
  role: GroupRole,
  options: CreateInviteOptions = {},
): CreatedGroupInvite {
  const { code, codeHash } = createReferralCode({ bytes: options.bytes });
  return {
    code,
    codeHash,
    role,
    expiresAt: options.expiresAt ?? null,
  };
}

export interface AcceptanceInput {
  readonly record: GroupInviteRecord | null | undefined;
  readonly rawCode: string;
  readonly now: Date | string;
  readonly alreadyMember: boolean;
}

export function decideInviteAcceptance(
  input: AcceptanceInput,
): InviteAcceptance {
  const { record, rawCode, now, alreadyMember } = input;

  // Reuse the E15/E8 timing-safe hash validation (malformed/mismatch/revoked).
  const codeCheck = validateReferralCode(
    record
      ? {
          codeHash: record.codeHash,
          status: record.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE',
        }
      : null,
    rawCode,
  );
  if (!codeCheck.valid) {
    return { accept: false, reason: codeCheck.reason };
  }

  if (record!.status === 'USED') {
    return { accept: false, reason: 'used' };
  }

  if (record!.expiresAt) {
    const expires =
      record!.expiresAt instanceof Date
        ? record!.expiresAt
        : new Date(record!.expiresAt);
    const at = now instanceof Date ? now : new Date(now);
    if (at.getTime() >= expires.getTime()) {
      return { accept: false, reason: 'expired' };
    }
  }

  if (alreadyMember) {
    return { accept: false, reason: 'already_member' };
  }

  return { accept: true, role: record!.role };
}
