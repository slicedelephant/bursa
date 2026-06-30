/**
 * E13 Employer-Matching — pure claim-status state machine.
 *
 * Owns the allowed transitions of a MatchClaim and the human display label per
 * status. No I/O, no mutation. Mirrors the verification-state / onboarding-status
 * pure cores.
 */

export type MatchClaimStatus =
  | 'DETECTED'
  | 'OFFERED'
  | 'CLAIMED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

/** Allowed forward transitions. Terminal states map to an empty set. */
const TRANSITIONS: Record<MatchClaimStatus, readonly MatchClaimStatus[]> = {
  DETECTED: ['OFFERED', 'CLAIMED', 'EXPIRED'],
  OFFERED: ['CLAIMED', 'EXPIRED'],
  CLAIMED: ['SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'EXPIRED'],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
};

const LABELS: Record<MatchClaimStatus, string> = {
  DETECTED: 'Detected',
  OFFERED: 'Offered',
  CLAIMED: 'Claimed',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

/** True when `to` is a legal next status from `from`. */
export function canTransition(
  from: MatchClaimStatus,
  to: MatchClaimStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** A status is terminal when no transitions lead out of it. */
export function isTerminal(status: MatchClaimStatus): boolean {
  return (TRANSITIONS[status]?.length ?? 0) === 0;
}

/** Human display label for a status (falls back to the raw value). */
export function statusLabel(status: MatchClaimStatus): string {
  return LABELS[status] ?? String(status);
}
