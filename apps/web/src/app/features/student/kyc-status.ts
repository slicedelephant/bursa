// Pure presentation helpers for the student KYC verification flow. No Angular,
// no I/O — fully unit-testable.

import { VerificationCaseStatus } from '../../core/models';

/** Human label for a verification case status. */
export function kycStatusLabel(status: VerificationCaseStatus): string {
  switch (status) {
    case 'STARTED':
      return 'Started';
    case 'LIVENESS_PASSED':
      return 'Liveness passed';
    case 'DOCUMENT_VERIFIED':
      return 'Document verified';
    case 'AML_CLEARED':
      return 'AML cleared';
    case 'VERIFIED':
      return 'Verified';
    case 'MANUAL_REVIEW':
      return 'In manual review';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}

/** Tailwind chip classes for a status (green verified, amber review, red reject). */
export function kycStatusClass(status: VerificationCaseStatus): string {
  switch (status) {
    case 'VERIFIED':
      return 'bg-brand-green/15 text-brand-green ring-brand-green/30';
    case 'REJECTED':
      return 'bg-brand-orange/15 text-brand-orange ring-brand-orange/30';
    case 'MANUAL_REVIEW':
      return 'bg-amber-100 text-amber-800 ring-amber-300';
    default:
      return 'bg-mist text-slate2 ring-black/10';
  }
}

/** Whether the liveness step can still be run (only from a freshly started case). */
export function canRunLiveness(status: VerificationCaseStatus): boolean {
  return status === 'STARTED';
}

/** Whether the document step can run (only after liveness passed). */
export function canRunDocument(status: VerificationCaseStatus): boolean {
  return status === 'LIVENESS_PASSED';
}

/** Whether the case has reached a terminal state. */
export function isCaseTerminal(status: VerificationCaseStatus): boolean {
  return status === 'VERIFIED' || status === 'REJECTED';
}

/** A 0-100 progress percentage for the verification flow. */
export function kycProgressPercent(status: VerificationCaseStatus): number {
  switch (status) {
    case 'STARTED':
      return 25;
    case 'LIVENESS_PASSED':
      return 60;
    case 'DOCUMENT_VERIFIED':
    case 'AML_CLEARED':
      return 90;
    case 'VERIFIED':
      return 100;
    case 'MANUAL_REVIEW':
      return 75;
    case 'REJECTED':
      return 100;
    default:
      return 0;
  }
}
