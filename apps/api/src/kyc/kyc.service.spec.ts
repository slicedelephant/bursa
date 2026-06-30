import { VerificationCaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../security/audit.service';
import type { AmlScreeningProvider } from './aml-screening.provider.interface';
import type { IdentityVerificationProvider } from './identity-verification.provider.interface';
import { KycService } from './kyc.service';
import type { RegistrarProvider } from '../schools/registrar.provider.interface';

function caseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    subjectType: 'STUDENT',
    subjectUserId: 'u1',
    admissionRecordId: 'adm1',
    status: VerificationCaseStatus.STARTED,
    reviewQueueStatus: 'NOT_REQUIRED',
    riskScore: 0,
    riskLevel: 'LOW',
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
    admissionRecord: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'adm1',
        schoolId: 's1',
        admissionRef: 'REF-1',
        studentName: 'Amara Okonkwo',
      }),
    },
    verificationCase: {
      create: jest.fn().mockResolvedValue(caseRow()),
      findFirst: jest.fn().mockResolvedValue(caseRow()),
      findMany: jest.fn().mockResolvedValue([caseRow()]),
      update: jest
        .fn()
        .mockImplementation(({ data }) =>
          Promise.resolve(caseRow({ ...data })),
        ),
    },
    livenessResult: { create: jest.fn().mockResolvedValue({}) },
    documentVerification: { create: jest.fn().mockResolvedValue({}) },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        displayName: 'Acme',
        corporateProfile: { companyName: 'Acme Corp' },
      }),
    },
  } as unknown as PrismaService & Record<string, any>;
}

function makeAudit() {
  return {
    record: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditService;
}

function makeIdentity(
  overrides: Partial<IdentityVerificationProvider> = {},
): IdentityVerificationProvider {
  return {
    checkLiveness: jest
      .fn()
      .mockResolvedValue({ confidence: 92, reference: 'lref' }),
    extractDocument: jest
      .fn()
      .mockResolvedValue({ extractedName: 'Amara Okonkwo', reference: 'dref' }),
    ...overrides,
  };
}

function makeAml(
  overrides: Partial<AmlScreeningProvider> = {},
): AmlScreeningProvider {
  return {
    screen: jest.fn().mockResolvedValue({ hit: false, reference: 'aref' }),
    ...overrides,
  };
}

function makeRegistrar(found = true): RegistrarProvider {
  return {
    lookupAdmission: jest
      .fn()
      .mockResolvedValue({ found, admissionRef: 'REF-1' }),
  };
}

function build(
  prisma = makePrisma(),
  identity = makeIdentity(),
  aml = makeAml(),
  registrar = makeRegistrar(),
) {
  const audit = makeAudit();
  const service = new KycService(prisma, audit, identity, aml, registrar);
  return { service, prisma, audit, identity, aml, registrar };
}

describe('KycService', () => {
  describe('startCase', () => {
    it('creates a STARTED case', async () => {
      const { service, prisma } = build();
      const result = await service.startCase('u1', 'adm1');
      expect(result.status).toBe(VerificationCaseStatus.STARTED);
      expect(prisma.verificationCase.create).toHaveBeenCalled();
    });

    it('throws NOT_FOUND for an unknown admission record', async () => {
      const prisma = makePrisma();
      (prisma as any).admissionRecord.findUnique.mockResolvedValueOnce(null);
      const { service } = build(prisma);
      await expect(service.startCase('u1', 'missing')).rejects.toMatchObject({
        response: { code: 'NOT_FOUND' },
      });
    });

    it('allows starting without an admission record', async () => {
      const { service } = build();
      const result = await service.startCase('u1');
      expect(result.status).toBe(VerificationCaseStatus.STARTED);
    });
  });

  describe('runLiveness', () => {
    it('passes liveness and audits it', async () => {
      const { service, prisma, audit } = build();
      const result = await service.runLiveness('u1', 'c1', 'live_ok');
      expect(prisma.livenessResult.create).toHaveBeenCalled();
      expect(result.status).toBe(VerificationCaseStatus.LIVENESS_PASSED);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'kyc.liveness.passed' }),
      );
    });

    it('routes a failed liveness to MANUAL_REVIEW', async () => {
      const identity = makeIdentity({
        checkLiveness: jest
          .fn()
          .mockResolvedValue({ confidence: 20, reference: 'lref' }),
      });
      const { service, audit } = build(makePrisma(), identity);
      const result = await service.runLiveness('u1', 'c1', 'live-FAIL');
      expect(result.status).toBe(VerificationCaseStatus.MANUAL_REVIEW);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'kyc.liveness.failed' }),
      );
    });

    it('throws NOT_FOUND for a case the user does not own', async () => {
      const prisma = makePrisma();
      (prisma as any).verificationCase.findFirst.mockResolvedValueOnce(null);
      const { service } = build(prisma);
      await expect(service.runLiveness('u1', 'c1', 'x')).rejects.toMatchObject({
        response: { code: 'NOT_FOUND' },
      });
    });

    it('throws INVALID_STATE when not freshly started', async () => {
      const prisma = makePrisma();
      (prisma as any).verificationCase.findFirst.mockResolvedValueOnce(
        caseRow({ status: VerificationCaseStatus.LIVENESS_PASSED }),
      );
      const { service } = build(prisma);
      await expect(service.runLiveness('u1', 'c1', 'x')).rejects.toMatchObject({
        response: { code: 'INVALID_STATE' },
      });
    });
  });

  describe('runDocument', () => {
    function livenessPassedPrisma() {
      const prisma = makePrisma();
      (prisma as any).verificationCase.findFirst.mockResolvedValue(
        caseRow({ status: VerificationCaseStatus.LIVENESS_PASSED }),
      );
      return prisma;
    }

    it('verifies a matching document and confirms with the registrar', async () => {
      const { service, prisma, registrar, audit } = build(
        livenessPassedPrisma(),
      );
      const result = await service.runDocument(
        'u1',
        'c1',
        'doc_ok',
        'Amara Okonkwo',
      );
      expect(prisma.documentVerification.create).toHaveBeenCalled();
      expect(registrar.lookupAdmission).toHaveBeenCalled();
      expect(result.status).toBe(VerificationCaseStatus.VERIFIED);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'kyc.document.verified' }),
      );
    });

    it('routes a name mismatch to MANUAL_REVIEW', async () => {
      const identity = makeIdentity({
        extractDocument: jest.fn().mockResolvedValue({
          extractedName: 'Someone Else',
          reference: 'dref',
        }),
      });
      const { service, audit } = build(livenessPassedPrisma(), identity);
      const result = await service.runDocument(
        'u1',
        'c1',
        'doc-MISMATCH',
        'Amara Okonkwo',
      );
      expect(result.status).toBe(VerificationCaseStatus.MANUAL_REVIEW);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'kyc.document.mismatch' }),
      );
    });

    it('throws INVALID_STATE when liveness has not passed', async () => {
      const { service } = build(); // findFirst returns STARTED
      await expect(
        service.runDocument('u1', 'c1', 'doc', 'Amara'),
      ).rejects.toMatchObject({ response: { code: 'INVALID_STATE' } });
    });
  });

  describe('screenSponsor', () => {
    it('clears a below-threshold contribution without a provider call', async () => {
      const { service, aml } = build();
      const result = await service.screenSponsor('u1', 100000, 'DE');
      expect(aml.screen).not.toHaveBeenCalled();
      expect(result.status).toBe(VerificationCaseStatus.VERIFIED);
    });

    it('routes an elevated-risk country above threshold to MANUAL_REVIEW', async () => {
      const prisma = makePrisma();
      (prisma as any).verificationCase.create.mockResolvedValue(
        caseRow({ subjectType: 'SPONSOR' }),
      );
      const { service, audit } = build(prisma);
      const result = await service.screenSponsor('u1', 600000, 'NG');
      expect(result.status).toBe(VerificationCaseStatus.MANUAL_REVIEW);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'kyc.aml.hit' }),
      );
    });

    it('blocks a sanctioned country with AML_BLOCKED', async () => {
      const prisma = makePrisma();
      (prisma as any).verificationCase.create.mockResolvedValue(
        caseRow({ subjectType: 'SPONSOR' }),
      );
      const { service } = build(prisma);
      await expect(
        service.screenSponsor('u1', 600000, 'RU'),
      ).rejects.toMatchObject({ response: { code: 'AML_BLOCKED' } });
    });

    it('clears a clean high-value contribution', async () => {
      const prisma = makePrisma();
      (prisma as any).verificationCase.create.mockResolvedValue(
        caseRow({ subjectType: 'SPONSOR' }),
      );
      const { service, aml } = build(prisma);
      const result = await service.screenSponsor('u1', 600000, 'DE');
      expect(aml.screen).toHaveBeenCalled();
      expect(result.status).toBe(VerificationCaseStatus.VERIFIED);
    });
  });

  describe('listForUser', () => {
    it('returns the user cases as views', async () => {
      const { service } = build();
      const result = await service.listForUser('u1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
    });
  });
});
