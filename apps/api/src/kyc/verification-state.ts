/**
 * E11 KYC — pure verification state machine.
 *
 * Owns the allowed transitions of a VerificationCase and derives the manual-
 * review-queue status. Any exception (failed liveness, name mismatch, AML hit)
 * routes to MANUAL_REVIEW with a PENDING queue status — never a silent pass.
 * No I/O, no mutation; the service applies the returned next-state to the DB.
 */

import {
  AmlDecision,
  ReviewQueueStatus,
  VerificationCaseStatus,
} from '@prisma/client';

/** Allowed forward transitions. MANUAL_REVIEW/REJECTED are reachable from any
 *  in-flight state (an exception can occur at any step). */
const ALLOWED: Record<VerificationCaseStatus, VerificationCaseStatus[]> = {
  [VerificationCaseStatus.STARTED]: [
    VerificationCaseStatus.LIVENESS_PASSED,
    VerificationCaseStatus.AML_CLEARED,
    VerificationCaseStatus.MANUAL_REVIEW,
    VerificationCaseStatus.REJECTED,
  ],
  [VerificationCaseStatus.LIVENESS_PASSED]: [
    VerificationCaseStatus.DOCUMENT_VERIFIED,
    VerificationCaseStatus.MANUAL_REVIEW,
    VerificationCaseStatus.REJECTED,
  ],
  [VerificationCaseStatus.DOCUMENT_VERIFIED]: [
    VerificationCaseStatus.VERIFIED,
    VerificationCaseStatus.MANUAL_REVIEW,
    VerificationCaseStatus.REJECTED,
  ],
  [VerificationCaseStatus.AML_CLEARED]: [
    VerificationCaseStatus.VERIFIED,
    VerificationCaseStatus.MANUAL_REVIEW,
    VerificationCaseStatus.REJECTED,
  ],
  [VerificationCaseStatus.MANUAL_REVIEW]: [
    VerificationCaseStatus.VERIFIED,
    VerificationCaseStatus.REJECTED,
  ],
  [VerificationCaseStatus.VERIFIED]: [],
  [VerificationCaseStatus.REJECTED]: [],
};

/** True if `to` is a permitted transition from `from`. */
export function canTransition(
  from: VerificationCaseStatus,
  to: VerificationCaseStatus,
): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

/** Map a case status to the queue status it implies. */
export function reviewQueueFor(
  status: VerificationCaseStatus,
): ReviewQueueStatus {
  if (status === VerificationCaseStatus.MANUAL_REVIEW) {
    return ReviewQueueStatus.PENDING;
  }
  return ReviewQueueStatus.NOT_REQUIRED;
}

/** Next state after the liveness step. */
export function nextAfterLiveness(passed: boolean): VerificationCaseStatus {
  return passed
    ? VerificationCaseStatus.LIVENESS_PASSED
    : VerificationCaseStatus.MANUAL_REVIEW;
}

/** Next state after the document step. A name match completes the student path. */
export function nextAfterDocument(matched: boolean): VerificationCaseStatus {
  return matched
    ? VerificationCaseStatus.VERIFIED
    : VerificationCaseStatus.MANUAL_REVIEW;
}

/** Next state after the AML step for a sponsor. */
export function nextAfterAml(decision: AmlDecision): VerificationCaseStatus {
  switch (decision) {
    case AmlDecision.CLEAR:
      return VerificationCaseStatus.VERIFIED;
    case AmlDecision.HIT:
      return VerificationCaseStatus.MANUAL_REVIEW;
    case AmlDecision.BLOCKED:
    default:
      return VerificationCaseStatus.REJECTED;
  }
}

/** Resolve an operator decision (APPROVE/REJECT) to a terminal state. */
export function applyReviewDecision(
  decision: 'APPROVE' | 'REJECT',
): VerificationCaseStatus {
  return decision === 'APPROVE'
    ? VerificationCaseStatus.VERIFIED
    : VerificationCaseStatus.REJECTED;
}

/** True once the case has reached a terminal state. */
export function isTerminal(status: VerificationCaseStatus): boolean {
  return (
    status === VerificationCaseStatus.VERIFIED ||
    status === VerificationCaseStatus.REJECTED
  );
}
