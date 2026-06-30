import {
  ReviewQueueStatus,
  RiskLevel,
  VerificationCaseStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../security/audit.service';
import {
  DashboardRow,
  KycReviewService,
  buildDashboard,
} from './kyc-review.service';

function makeCaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    subjectType: 'STUDENT',
    subjectUserId: 'u1',
    admissionRecordId: null,
    status: VerificationCaseStatus.MANUAL_REVIEW,
    reviewQueueStatus: ReviewQueueStatus.PENDING,
    riskScore: 30,
    riskLevel: RiskLevel.MEDIUM,
    decisionNote: null,
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date('2026-06-30T10:00:00.000Z'),
    updatedAt: new Date('2026-06-30T10:00:00.000Z'),
    liveness: null,
    document: null,
    aml: null,
    ...overrides,
  };
}

function makePrisma() {
  return {
    verificationCase: {
      findMany: jest.fn().mockResolvedValue([makeCaseRow()]),
      findUnique: jest.fn().mockResolvedValue(makeCaseRow()),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve(makeCaseRow({ ...data })),
        ),
    },
  } as unknown as PrismaService & {
    verificationCase: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
}

function makeAudit() {
  return {
    record: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditService;
}

describe('KycReviewService', () => {
  describe('listQueue', () => {
    it('defaults to PENDING and sorts by risk', async () => {
      const prisma = makePrisma();
      const service = new KycReviewService(prisma, makeAudit());
      const result = await service.listQueue();
      expect(result).toHaveLength(1);
      expect(prisma.verificationCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reviewQueueStatus: ReviewQueueStatus.PENDING },
        }),
      );
    });

    it('honours a valid status filter', async () => {
      const prisma = makePrisma();
      const service = new KycReviewService(prisma, makeAudit());
      await service.listQueue('APPROVED');
      expect(prisma.verificationCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reviewQueueStatus: ReviewQueueStatus.APPROVED },
        }),
      );
    });

    it('falls back to PENDING for an unknown status', async () => {
      const prisma = makePrisma();
      const service = new KycReviewService(prisma, makeAudit());
      await service.listQueue('NONSENSE');
      expect(prisma.verificationCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reviewQueueStatus: ReviewQueueStatus.PENDING },
        }),
      );
    });
  });

  describe('getCase', () => {
    it('returns a view when found', async () => {
      const prisma = makePrisma();
      const service = new KycReviewService(prisma, makeAudit());
      const result = await service.getCase('c1');
      expect(result.id).toBe('c1');
    });

    it('throws NOT_FOUND when missing', async () => {
      const prisma = makePrisma();
      prisma.verificationCase.findUnique.mockResolvedValueOnce(null);
      const service = new KycReviewService(prisma, makeAudit());
      await expect(service.getCase('x')).rejects.toMatchObject({
        response: { code: 'NOT_FOUND' },
      });
    });
  });

  describe('decide', () => {
    it('approves a pending case and audits it', async () => {
      const prisma = makePrisma();
      const audit = makeAudit();
      const service = new KycReviewService(prisma, audit);
      const result = await service.decide('c1', 'admin1', 'APPROVE', 'ok');
      expect(result.status).toBe(VerificationCaseStatus.VERIFIED);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'kyc.review.approved' }),
      );
    });

    it('rejects a pending case', async () => {
      const prisma = makePrisma();
      const service = new KycReviewService(prisma, makeAudit());
      const result = await service.decide('c1', 'admin1', 'REJECT', 'no');
      expect(result.status).toBe(VerificationCaseStatus.REJECTED);
    });

    it('throws ALREADY_DECIDED when not pending', async () => {
      const prisma = makePrisma();
      prisma.verificationCase.findUnique.mockResolvedValueOnce(
        makeCaseRow({ reviewQueueStatus: ReviewQueueStatus.APPROVED }),
      );
      const service = new KycReviewService(prisma, makeAudit());
      await expect(
        service.decide('c1', 'admin1', 'APPROVE', 'ok'),
      ).rejects.toMatchObject({ response: { code: 'ALREADY_DECIDED' } });
    });
  });

  describe('dashboard', () => {
    it('aggregates counts', async () => {
      const prisma = makePrisma();
      prisma.verificationCase.findMany.mockResolvedValueOnce([
        {
          status: VerificationCaseStatus.VERIFIED,
          reviewQueueStatus: ReviewQueueStatus.NOT_REQUIRED,
          riskLevel: RiskLevel.LOW,
        },
        {
          status: VerificationCaseStatus.MANUAL_REVIEW,
          reviewQueueStatus: ReviewQueueStatus.PENDING,
          riskLevel: RiskLevel.HIGH,
        },
      ]);
      const service = new KycReviewService(prisma, makeAudit());
      const result = await service.dashboard();
      expect(result.total).toBe(2);
      expect(result.pendingReview).toBe(1);
      expect(result.riskDistribution.HIGH).toBe(1);
    });
  });
});

describe('buildDashboard (pure)', () => {
  it('returns zeros for an empty input', () => {
    const result = buildDashboard([]);
    expect(result.total).toBe(0);
    expect(result.pendingReview).toBe(0);
    expect(result.riskDistribution).toEqual({
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    });
  });

  it('tallies statuses, pending and risk bands', () => {
    const rows: DashboardRow[] = [
      {
        status: VerificationCaseStatus.VERIFIED,
        reviewQueueStatus: ReviewQueueStatus.NOT_REQUIRED,
        riskLevel: RiskLevel.LOW,
      },
      {
        status: VerificationCaseStatus.MANUAL_REVIEW,
        reviewQueueStatus: ReviewQueueStatus.PENDING,
        riskLevel: RiskLevel.CRITICAL,
      },
      {
        status: VerificationCaseStatus.MANUAL_REVIEW,
        reviewQueueStatus: ReviewQueueStatus.PENDING,
        riskLevel: RiskLevel.MEDIUM,
      },
    ];
    const result = buildDashboard(rows);
    expect(result.total).toBe(3);
    expect(result.byStatus[VerificationCaseStatus.MANUAL_REVIEW]).toBe(2);
    expect(result.pendingReview).toBe(2);
    expect(result.riskDistribution.CRITICAL).toBe(1);
  });
});
