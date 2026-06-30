import { Inject, Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { SavePayoutDto } from './dto/save-payout.dto';
import { SignAgreementDto } from './dto/sign-agreement.dto';
import {
  ESIGNATURE_PROVIDER,
  type EsignatureProvider,
} from './e-signature.provider.interface';
import {
  canTransition,
  isPayoutDataComplete,
  nextOnboardingStatus,
} from './onboarding-status';
import {
  createOnboardingToken,
  hashToken,
  validateOnboardingToken,
} from './onboarding-token';

const AGREEMENT_TITLE = 'Bursa Partner Funding Agreement';
const DEFAULT_TTL_HOURS = 168; // 7 days

/**
 * Self-serve onboarding (E8): payout data, mock e-signature, the hosted
 * one-time-token flow and link generation. Activating a school sets
 * `payoutVerified`, which is the existing trust gate that lets its campaigns go
 * live (Constitution II) — money still flows only to the school.
 */
@Injectable()
export class SchoolOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ESIGNATURE_PROVIDER) private readonly esign: EsignatureProvider,
  ) {}

  async savePayout(schoolId: string, dto: SavePayoutDto) {
    const school = await this.requireSchool(schoolId);
    const onboardingStatus = canTransition(school.onboardingStatus, 'start')
      ? nextOnboardingStatus(school.onboardingStatus, 'start')
      : school.onboardingStatus;
    return this.prisma.school.update({
      where: { id: schoolId },
      data: {
        bankAccountName: dto.bankAccountName,
        iban: dto.iban,
        bic: dto.bic ?? school.bic,
        taxId: dto.taxId,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        onboardingStatus,
      },
    });
  }

  async signAgreement(schoolId: string, dto: SignAgreementDto) {
    const school = await this.requireSchool(schoolId);
    if (!isPayoutDataComplete(school)) {
      throw new DomainException(
        'PAYOUT_INCOMPLETE',
        'Enter payout & tax details before signing the agreement',
        409,
      );
    }
    const signed = await this.esign.signAgreement({
      schoolId,
      schoolName: school.name,
      signerName: dto.signerName,
      documentTitle: AGREEMENT_TITLE,
    });
    return this.prisma.school.update({
      where: { id: schoolId },
      data: {
        agreementSignedAt: signed.signedAt,
        agreementSignerName: signed.signerName,
        agreementRef: signed.agreementRef,
        onboardingStatus: 'ACTIVE',
        payoutVerified: true,
      },
    });
  }

  async generateLink(schoolId: string, expiresInHours?: number) {
    await this.requireSchool(schoolId);
    const ttlMs = (expiresInHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
    const created = createOnboardingToken({ ttlMs });
    await this.prisma.schoolOnboardingToken.create({
      data: {
        schoolId,
        tokenHash: created.tokenHash,
        expiresAt: created.expiresAt,
      },
    });
    return {
      token: created.token,
      path: `/school/onboarding/${created.token}`,
      expiresAt: created.expiresAt,
    };
  }

  async getOnboardingByToken(rawToken: string) {
    const { school } = await this.resolveToken(rawToken);
    return {
      schoolId: school.id,
      schoolName: school.name,
      country: school.country,
      onboardingStatus: school.onboardingStatus,
    };
  }

  async completeViaToken(rawToken: string, dto: CompleteOnboardingDto) {
    const { token, school } = await this.resolveToken(rawToken);
    const signed = await this.esign.signAgreement({
      schoolId: school.id,
      schoolName: school.name,
      signerName: dto.signerName,
      documentTitle: AGREEMENT_TITLE,
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.schoolOnboardingToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
      return tx.school.update({
        where: { id: school.id },
        data: {
          bankAccountName: dto.bankAccountName,
          iban: dto.iban,
          bic: dto.bic ?? null,
          taxId: dto.taxId,
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
          agreementSignedAt: signed.signedAt,
          agreementSignerName: signed.signerName,
          agreementRef: signed.agreementRef,
          onboardingStatus: 'ACTIVE',
          payoutVerified: true,
        },
      });
    });
    return {
      schoolId: updated.id,
      schoolName: updated.name,
      onboardingStatus: updated.onboardingStatus,
    };
  }

  private async resolveToken(rawToken: string) {
    const tokenHash = hashToken(rawToken ?? '');
    const token = await this.prisma.schoolOnboardingToken.findUnique({
      where: { tokenHash },
      include: { school: true },
    });
    const result = validateOnboardingToken(
      token
        ? {
            tokenHash: token.tokenHash,
            expiresAt: token.expiresAt,
            usedAt: token.usedAt,
          }
        : null,
      rawToken ?? '',
    );
    if (!result.valid || !token) {
      throw new DomainException(
        'INVALID_TOKEN',
        `Onboarding link is ${result.reason ?? 'invalid'}`,
        400,
      );
    }
    return { token, school: token.school };
  }

  private async requireSchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new DomainException('NOT_FOUND', 'School not found', 404);
    }
    return school;
  }
}
