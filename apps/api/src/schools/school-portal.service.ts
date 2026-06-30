import { Injectable } from '@nestjs/common';
import { DonationStatus, School } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import {
  onboardingChecklist,
  onboardingProgressPct,
} from './onboarding-status';
import { buildSchoolDashboard } from './school-dashboard';

const COUNTED_DONATIONS: DonationStatus[] = [
  'SUCCEEDED',
  'CAPTURED',
  'PLEDGED',
];

function maskIban(iban?: string | null): string | null {
  if (!iban) return null;
  const trimmed = iban.replace(/\s+/g, '');
  return trimmed.length <= 4 ? '••••' : `•••• ${trimmed.slice(-4)}`;
}

/**
 * Resolves the school for a SCHOOL_ADMIN user and serves the branded portal's
 * profile + real-time dashboard. The school-admin only ever sees their own
 * school; the IBAN is masked in responses (never echoed in full).
 */
@Injectable()
export class SchoolPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveSchoolId(userId: string): Promise<string> {
    const link = await this.prisma.schoolAdmin.findUnique({
      where: { userId },
    });
    if (!link) {
      throw new DomainException(
        'FORBIDDEN',
        'You are not linked to a school',
        403,
      );
    }
    return link.schoolId;
  }

  async getMySchool(userId: string) {
    const schoolId = await this.resolveSchoolId(userId);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new DomainException('NOT_FOUND', 'School not found', 404);
    }
    return {
      school: this.publicSchool(school),
      onboarding: {
        status: school.onboardingStatus,
        progressPct: onboardingProgressPct(school),
        checklist: onboardingChecklist(school),
        agreementSignedAt: school.agreementSignedAt,
        agreementSignerName: school.agreementSignerName,
      },
    };
  }

  async dashboard(userId: string) {
    const schoolId = await this.resolveSchoolId(userId);
    const campaigns = await this.prisma.campaign.findMany({
      where: { schoolId },
      include: {
        studentProfile: { select: { fullName: true } },
        payout: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const donations = await this.prisma.donation.findMany({
      where: { campaign: { schoolId }, status: { in: COUNTED_DONATIONS } },
      select: { amountCents: true, donorCountry: true },
    });

    return buildSchoolDashboard(
      campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        studentName: campaign.studentProfile?.fullName ?? 'Unknown',
        status: campaign.status,
        goalCents: campaign.goalCents,
        raisedCents: campaign.raisedCents,
        payout: campaign.payout,
      })),
      donations.map((donation) => ({
        amountCents: donation.amountCents,
        donorCountry: donation.donorCountry,
      })),
    );
  }

  private publicSchool(school: School) {
    return {
      id: school.id,
      name: school.name,
      country: school.country,
      city: school.city,
      website: school.website,
      logoUrl: school.logoUrl,
      slug: school.slug,
      onboardingStatus: school.onboardingStatus,
      payoutVerified: school.payoutVerified,
      bankAccountName: school.bankAccountName,
      ibanMasked: maskIban(school.iban),
      bic: school.bic,
      taxId: school.taxId,
      contactName: school.contactName,
      contactEmail: school.contactEmail,
    };
  }
}
