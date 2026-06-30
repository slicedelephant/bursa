/**
 * E11 KYC — pure DB-row → API-view mapper.
 *
 * Shapes a VerificationCase (with its 1:1 step children) into the stable
 * `VerificationCaseView` from the contract. No I/O, no mutation; building new
 * objects only (Constitution IV).
 */

import {
  AmlDecision,
  AmlScreening,
  DocumentVerification,
  LivenessResult,
  ReviewQueueStatus,
  RiskLevel,
  VerificationCase,
  VerificationCaseStatus,
  VerificationSubject,
} from '@prisma/client';

export interface VerificationCaseView {
  id: string;
  subjectType: VerificationSubject;
  status: VerificationCaseStatus;
  reviewQueueStatus: ReviewQueueStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  decisionNote: string | null;
  liveness: {
    provider: string;
    confidence: number;
    passed: boolean;
  } | null;
  document: {
    provider: string;
    extractedName: string;
    nameMatchScore: number;
    matched: boolean;
    registrarConfirmed: boolean;
  } | null;
  aml: {
    provider: string;
    amountCents: number;
    country: string;
    decision: AmlDecision;
    reasons: string[];
  } | null;
  createdAt: string;
}

export type CaseWithSteps = VerificationCase & {
  liveness?: LivenessResult | null;
  document?: DocumentVerification | null;
  aml?: AmlScreening | null;
};

function reasonsToStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((r) => String(r)) : [];
}

/** Map a case row (with optional step children) to the API view. */
export function toCaseView(row: CaseWithSteps): VerificationCaseView {
  return {
    id: row.id,
    subjectType: row.subjectType,
    status: row.status,
    reviewQueueStatus: row.reviewQueueStatus,
    riskScore: row.riskScore,
    riskLevel: row.riskLevel,
    decisionNote: row.decisionNote ?? null,
    liveness: row.liveness
      ? {
          provider: row.liveness.provider,
          confidence: row.liveness.confidence,
          passed: row.liveness.passed,
        }
      : null,
    document: row.document
      ? {
          provider: row.document.provider,
          extractedName: row.document.extractedName,
          nameMatchScore: row.document.nameMatchScore,
          matched: row.document.matched,
          registrarConfirmed: row.document.registrarConfirmed,
        }
      : null,
    aml: row.aml
      ? {
          provider: row.aml.provider,
          amountCents: row.aml.amountCents,
          country: row.aml.country,
          decision: row.aml.decision,
          reasons: reasonsToStringArray(row.aml.reasons),
        }
      : null,
    createdAt: row.createdAt.toISOString(),
  };
}
