import { Injectable } from '@nestjs/common';
import {
  ReviewQueueStatus,
  RiskLevel,
  VerificationCaseStatus,
} from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../security/audit.service';
import { CaseWithSteps, toCaseView } from './case-view';
import { applyReviewDecision } from './verification-state';

const CASE_INCLUDE = { liveness: true, document: true, aml: true } as const;

const REVIEW_STATUSES = new Set<string>([
  ReviewQueueStatus.PENDING,
  ReviewQueueStatus.APPROVED,
  ReviewQueueStatus.REJECTED,
]);

/**
 * E11 KYC manual-review queue. ADMIN operators list pending exception cases
 * (failed liveness / OCR mismatch / AML hit), decide APPROVE/REJECT, and read an
 * aggregate dashboard. Every decision is logged to the reused E6 AuditService.
 */
@Injectable()
export class KycReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listQueue(status?: string) {
    const queueStatus =
      status && REVIEW_STATUSES.has(status)
        ? (status as ReviewQueueStatus)
        : ReviewQueueStatus.PENDING;
    const rows = await this.prisma.verificationCase.findMany({
      where: { reviewQueueStatus: queueStatus },
      include: CASE_INCLUDE,
      orderBy: [{ riskScore: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => toCaseView(row as CaseWithSteps));
  }

  async getCase(caseId: string) {
    const row = await this.requireCase(caseId);
    return toCaseView(row as CaseWithSteps);
  }

  async decide(
    caseId: string,
    reviewerId: string,
    decision: 'APPROVE' | 'REJECT',
    note: string,
  ) {
    const current = await this.requireCase(caseId);
    if (current.reviewQueueStatus !== ReviewQueueStatus.PENDING) {
      throw new DomainException(
        'ALREADY_DECIDED',
        'This case is no longer pending review',
        409,
      );
    }
    const nextStatus = applyReviewDecision(decision);
    const reviewQueueStatus =
      decision === 'APPROVE'
        ? ReviewQueueStatus.APPROVED
        : ReviewQueueStatus.REJECTED;

    const updated = await this.prisma.verificationCase.update({
      where: { id: caseId },
      data: {
        status: nextStatus,
        reviewQueueStatus,
        decisionNote: note,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: CASE_INCLUDE,
    });
    await this.audit.record({
      action:
        decision === 'APPROVE' ? 'kyc.review.approved' : 'kyc.review.rejected',
      actorUserId: reviewerId,
      targetType: 'VerificationCase',
      targetId: caseId,
      metadata: { note },
    });
    return toCaseView(updated as CaseWithSteps);
  }

  async dashboard() {
    const rows = await this.prisma.verificationCase.findMany({
      select: { status: true, reviewQueueStatus: true, riskLevel: true },
    });
    return buildDashboard(rows);
  }

  private async requireCase(caseId: string) {
    const found = await this.prisma.verificationCase.findUnique({
      where: { id: caseId },
      include: CASE_INCLUDE,
    });
    if (!found) {
      throw new DomainException(
        'NOT_FOUND',
        'Verification case not found',
        404,
      );
    }
    return found;
  }
}

export interface DashboardRow {
  status: VerificationCaseStatus;
  reviewQueueStatus: ReviewQueueStatus;
  riskLevel: RiskLevel;
}

export interface KycDashboardView {
  total: number;
  byStatus: Record<string, number>;
  pendingReview: number;
  riskDistribution: Record<RiskLevel, number>;
}

/** Pure aggregation of case rows into the dashboard view (exported for tests). */
export function buildDashboard(rows: DashboardRow[]): KycDashboardView {
  const byStatus: Record<string, number> = {};
  const riskDistribution: Record<RiskLevel, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  let pendingReview = 0;

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    riskDistribution[row.riskLevel] += 1;
    if (row.reviewQueueStatus === ReviewQueueStatus.PENDING) {
      pendingReview += 1;
    }
  }

  return {
    total: rows.length,
    byStatus,
    pendingReview,
    riskDistribution,
  };
}
