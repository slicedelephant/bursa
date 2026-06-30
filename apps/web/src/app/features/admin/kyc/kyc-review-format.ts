// Pure presentation helpers for the KYC operator review console. No Angular,
// no I/O — fully unit-testable.

import { AmlDecision, KycRiskLevel, VerificationCaseStatus } from '../../../core/models';

/** Title-cases a risk level, e.g. HIGH → "High". */
export function riskLevelLabel(level: KycRiskLevel): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/** Tailwind chip classes for a risk level (green → amber → orange). */
export function riskLevelClass(level: KycRiskLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'bg-brand-orange/15 text-brand-orange ring-brand-orange/30';
    case 'HIGH':
      return 'bg-amber-100 text-amber-800 ring-amber-300';
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    default:
      return 'bg-mist text-slate2 ring-black/10';
  }
}

/** Human label for a case status. */
export function caseStatusLabel(status: VerificationCaseStatus): string {
  switch (status) {
    case 'MANUAL_REVIEW':
      return 'In review';
    case 'VERIFIED':
      return 'Verified';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status
        .toLowerCase()
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
}

/** Human label for an AML decision. */
export function amlDecisionLabel(decision: AmlDecision): string {
  switch (decision) {
    case 'CLEAR':
      return 'Clear';
    case 'HIT':
      return 'Watchlist hit';
    case 'BLOCKED':
      return 'Blocked (sanctioned)';
    default:
      return decision;
  }
}

/** Compact one-line reason why a case is in the queue. */
export function reviewReason(opts: {
  liveness: { passed: boolean } | null;
  document: { matched: boolean } | null;
  aml: { decision: AmlDecision } | null;
}): string {
  if (opts.liveness && !opts.liveness.passed) return 'Liveness check failed';
  if (opts.document && !opts.document.matched) return 'Document name mismatch';
  if (opts.aml && opts.aml.decision === 'HIT') return 'AML watchlist hit';
  if (opts.aml && opts.aml.decision === 'BLOCKED') {
    return 'AML blocked (sanctioned country)';
  }
  return 'Manual review required';
}

/** A clamped 0-100 score as a CSS width string for a score bar. */
export function scoreBarWidth(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  return `${clamped}%`;
}
