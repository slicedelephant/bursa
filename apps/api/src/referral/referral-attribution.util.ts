// Pure referral-attribution decision logic (E15). No I/O. Decides whether a
// successful donation should be attributed to a referral/advocate code. It does NOT
// touch money: attribution never changes the amount, status, or recipient of a
// donation — funds still flow to the school. The actual persistence (and the DB
// `donationId` unique that guarantees dedupe) lives in the service. Returns new
// values; never mutates inputs.

import {
  CodeValidationResult,
  validateReferralCode,
  ReferralCodeRecord,
} from './referral-code.util';

export type ReferralKind = 'REFERRAL' | 'ADVOCATE';

/** Donation statuses that count as a conversion (mirrors the E4 DonorsService). */
export const COUNTED_DONATION_STATUSES = [
  'PLEDGED',
  'CAPTURED',
  'SUCCEEDED',
] as const;

export type AttributionSkipReason =
  | 'invalid_code'
  | 'uncounted_status'
  | 'self_referral'
  | 'already_attributed';

export interface AttributionInput {
  /** Raw code presented at donate time. */
  readonly code: string;
  /** Stored record for that code (hash + status), or null when unknown. */
  readonly record: ReferralCodeRecord | null | undefined;
  readonly kind: ReferralKind;
  /** Donation status after the pledge/capture attempt. */
  readonly donationStatus: string;
  /** Donor of the new donation (may be anonymous → undefined). */
  readonly donorUserId?: string | null;
  /** Owner of the code (referrer/advocate inviter) — used to block self-referral. */
  readonly referrerUserId?: string | null;
  /** True when this donation already has an attribution row (dedupe signal). */
  readonly alreadyAttributed: boolean;
}

export interface AttributionDecision {
  readonly attribute: boolean;
  readonly kind: ReferralKind;
  readonly reason?: AttributionSkipReason;
  readonly codeValidation: CodeValidationResult;
}

function isCounted(status: string): boolean {
  return (COUNTED_DONATION_STATUSES as readonly string[]).includes(status);
}

/**
 * Pure decision: attribute this donation to the code, or skip with a reason.
 * Checks (in order): code validity → counted status → not self-referral →
 * not already attributed.
 */
export function resolveAttribution(
  input: AttributionInput,
): AttributionDecision {
  const codeValidation = validateReferralCode(input.record, input.code);

  if (!codeValidation.valid) {
    return {
      attribute: false,
      kind: input.kind,
      reason: 'invalid_code',
      codeValidation,
    };
  }
  if (!isCounted(input.donationStatus)) {
    return {
      attribute: false,
      kind: input.kind,
      reason: 'uncounted_status',
      codeValidation,
    };
  }
  if (
    input.donorUserId &&
    input.referrerUserId &&
    input.donorUserId === input.referrerUserId
  ) {
    return {
      attribute: false,
      kind: input.kind,
      reason: 'self_referral',
      codeValidation,
    };
  }
  if (input.alreadyAttributed) {
    return {
      attribute: false,
      kind: input.kind,
      reason: 'already_attributed',
      codeValidation,
    };
  }

  return { attribute: true, kind: input.kind, codeValidation };
}
