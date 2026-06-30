import { Inject, Injectable } from '@nestjs/common';
import {
  AmlDecision,
  RiskLevel,
  VerificationCaseStatus,
  VerificationSubject,
} from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  REGISTRAR_PROVIDER,
  type RegistrarProvider,
} from '../schools/registrar.provider.interface';
import { AuditService } from '../security/audit.service';
import { decideAml, requiresAmlScreening } from './aml-decision';
import {
  AML_SCREENING_PROVIDER,
  type AmlScreeningProvider,
} from './aml-screening.provider.interface';
import { CaseWithSteps, toCaseView } from './case-view';
import {
  IDENTITY_VERIFICATION_PROVIDER,
  type IdentityVerificationProvider,
} from './identity-verification.provider.interface';
import { evaluateLiveness } from './liveness-result';
import { matchName } from './name-match';
import { scoreStudentRisk } from './risk-score';
import {
  nextAfterAml,
  nextAfterDocument,
  nextAfterLiveness,
  reviewQueueFor,
} from './verification-state';

const CASE_INCLUDE = { liveness: true, document: true, aml: true } as const;

/**
 * E11 KYC orchestration. Runs each verification step through the swappable
 * provider seams, decides outcomes with the pure cores, persists step results
 * and the case state, and logs every decision to the reused E6 AuditService.
 * Reuses the E8 AdmissionRecord + RegistrarProvider for the document match.
 * Never touches the money path — money still flows only to the school.
 */
@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IDENTITY_VERIFICATION_PROVIDER)
    private readonly identity: IdentityVerificationProvider,
    @Inject(AML_SCREENING_PROVIDER)
    private readonly aml: AmlScreeningProvider,
    @Inject(REGISTRAR_PROVIDER)
    private readonly registrar: RegistrarProvider,
  ) {}

  async startCase(userId: string, admissionRecordId?: string) {
    if (admissionRecordId) {
      const record = await this.prisma.admissionRecord.findUnique({
        where: { id: admissionRecordId },
      });
      if (!record) {
        throw new DomainException(
          'NOT_FOUND',
          'Admission record not found',
          404,
        );
      }
    }
    const created = await this.prisma.verificationCase.create({
      data: {
        subjectType: VerificationSubject.STUDENT,
        subjectUserId: userId,
        admissionRecordId: admissionRecordId ?? null,
      },
      include: CASE_INCLUDE,
    });
    return toCaseView(created);
  }

  async runLiveness(userId: string, caseId: string, livenessToken: string) {
    const current = await this.requireOwnedCase(userId, caseId);
    if (current.status !== VerificationCaseStatus.STARTED) {
      throw new DomainException(
        'INVALID_STATE',
        'Liveness can only run on a freshly started case',
        409,
      );
    }
    const raw = await this.identity.checkLiveness({ livenessToken });
    const evaluation = evaluateLiveness(raw.confidence);
    await this.prisma.livenessResult.create({
      data: {
        caseId,
        provider: 'identity',
        confidence: evaluation.confidence,
        passed: evaluation.passed,
        reference: raw.reference,
      },
    });
    const nextStatus = nextAfterLiveness(evaluation.passed);
    const updated = await this.applyStatus(caseId, nextStatus);
    await this.audit.record({
      action: evaluation.passed ? 'kyc.liveness.passed' : 'kyc.liveness.failed',
      actorUserId: userId,
      targetType: 'VerificationCase',
      targetId: caseId,
      metadata: { confidence: evaluation.confidence },
    });
    return toCaseView(updated);
  }

  async runDocument(
    userId: string,
    caseId: string,
    documentToken: string,
    claimedName: string,
  ) {
    const current = await this.requireOwnedCase(userId, caseId);
    if (current.status !== VerificationCaseStatus.LIVENESS_PASSED) {
      throw new DomainException(
        'INVALID_STATE',
        'Document step requires a passed liveness check first',
        409,
      );
    }
    const admission = current.admissionRecordId
      ? await this.prisma.admissionRecord.findUnique({
          where: { id: current.admissionRecordId },
        })
      : null;

    const ocr = await this.identity.extractDocument({
      documentToken,
      claimedName,
    });
    const referenceName = admission?.studentName ?? claimedName;
    const match = matchName(ocr.extractedName, referenceName);
    const registrarConfirmed = await this.confirmWithRegistrar(admission);

    await this.prisma.documentVerification.create({
      data: {
        caseId,
        provider: 'identity',
        extractedName: ocr.extractedName,
        extractedSchool: ocr.extractedSchool ?? null,
        extractedDegree: ocr.extractedDegree ?? null,
        nameMatchScore: match.score,
        matched: match.matched,
        registrarConfirmed,
        reference: ocr.reference,
      },
    });

    // A matched admission from an E8 partner school is an accredited anchor; an
    // unmatched document keeps the school-accreditation signal unverified.
    const risk = scoreStudentRisk({
      incomeVerified: true,
      schoolAccredited: registrarConfirmed || match.matched,
    });
    const nextStatus = nextAfterDocument(match.matched);
    const updated = await this.applyStatus(caseId, nextStatus, {
      riskScore: risk.score,
      riskLevel: risk.level,
    });
    await this.audit.record({
      action: match.matched ? 'kyc.document.verified' : 'kyc.document.mismatch',
      actorUserId: userId,
      targetType: 'VerificationCase',
      targetId: caseId,
      metadata: { nameMatchScore: match.score, registrarConfirmed },
    });
    return toCaseView(updated);
  }

  async screenSponsor(userId: string, amountCents: number, country: string) {
    const subjectName = await this.resolveSponsorName(userId);
    const providerHit = requiresAmlScreening(amountCents)
      ? (await this.aml.screen({ amountCents, country, subjectName })).hit
      : false;
    const decision = decideAml({ amountCents, country, providerHit });

    const created = await this.prisma.verificationCase.create({
      data: {
        subjectType: VerificationSubject.SPONSOR,
        subjectUserId: userId,
        aml: {
          create: {
            provider: 'aml',
            amountCents,
            country: country.toUpperCase(),
            decision: decision.decision,
            reasons: decision.reasons,
            reference: `aml_${Date.now()}`,
          },
        },
      },
      include: CASE_INCLUDE,
    });

    const nextStatus = nextAfterAml(decision.decision);
    const updated = await this.applyStatus(created.id, nextStatus);
    await this.audit.record({
      action: this.amlAction(decision.decision),
      actorUserId: userId,
      targetType: 'VerificationCase',
      targetId: created.id,
      metadata: { decision: decision.decision, country: country.toUpperCase() },
    });
    if (decision.decision === AmlDecision.BLOCKED) {
      // Persist the block, then surface it loudly to the boundary.
      throw new DomainException(
        'AML_BLOCKED',
        'Contribution blocked by AML screening (sanctioned country)',
        422,
      );
    }
    return toCaseView(updated);
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.verificationCase.findMany({
      where: { subjectUserId: userId },
      include: CASE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toCaseView(row as CaseWithSteps));
  }

  private async resolveSponsorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { corporateProfile: true },
    });
    return (
      user?.corporateProfile?.companyName ?? user?.displayName ?? 'Sponsor'
    );
  }

  private async confirmWithRegistrar(
    admission: { schoolId: string; admissionRef: string } | null,
  ): Promise<boolean> {
    if (!admission) return false;
    const lookup = await this.registrar.lookupAdmission(
      admission.schoolId,
      admission.admissionRef,
    );
    return lookup.found;
  }

  private async applyStatus(
    caseId: string,
    status: VerificationCaseStatus,
    extra: {
      riskScore?: number;
      riskLevel?: RiskLevel;
    } = {},
  ) {
    return this.prisma.verificationCase.update({
      where: { id: caseId },
      data: {
        status,
        reviewQueueStatus: reviewQueueFor(status),
        ...(extra.riskScore !== undefined
          ? { riskScore: extra.riskScore }
          : {}),
        ...(extra.riskLevel !== undefined
          ? { riskLevel: extra.riskLevel }
          : {}),
      },
      include: CASE_INCLUDE,
    });
  }

  private amlAction(decision: AmlDecision): string {
    switch (decision) {
      case AmlDecision.CLEAR:
        return 'kyc.aml.clear';
      case AmlDecision.HIT:
        return 'kyc.aml.hit';
      case AmlDecision.BLOCKED:
      default:
        return 'kyc.aml.blocked';
    }
  }

  private async requireOwnedCase(userId: string, caseId: string) {
    const found = await this.prisma.verificationCase.findFirst({
      where: { id: caseId, subjectUserId: userId },
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
