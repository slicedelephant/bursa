// Pure presentation helpers for the sponsor AML-status surface. No Angular,
// no I/O — fully unit-testable.

import { AmlDecision, VerificationCaseStatus } from '../../core/models';

/** Human label for an AML decision. */
export function amlStatusLabel(decision: AmlDecision): string {
  switch (decision) {
    case 'CLEAR':
      return 'Cleared';
    case 'HIT':
      return 'Flagged for review';
    case 'BLOCKED':
      return 'Blocked';
    default:
      return decision;
  }
}

/** Tailwind chip classes for an AML decision. */
export function amlStatusClass(decision: AmlDecision): string {
  switch (decision) {
    case 'CLEAR':
      return 'bg-brand-green/15 text-brand-green ring-brand-green/30';
    case 'BLOCKED':
      return 'bg-brand-orange/15 text-brand-orange ring-brand-orange/30';
    case 'HIT':
      return 'bg-amber-100 text-amber-800 ring-amber-300';
    default:
      return 'bg-mist text-slate2 ring-black/10';
  }
}

/** Short, human explanation of what a sponsor should expect next. */
export function amlNextStep(status: VerificationCaseStatus): string {
  switch (status) {
    case 'VERIFIED':
      return 'Your contribution passed the compliance check. No action needed.';
    case 'MANUAL_REVIEW':
      return 'Our team is reviewing your contribution. We will be in touch shortly.';
    case 'REJECTED':
      return 'This contribution could not be processed for compliance reasons.';
    default:
      return 'Screening in progress.';
  }
}
