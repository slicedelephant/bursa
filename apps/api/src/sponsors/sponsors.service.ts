import { Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { buildReceipt } from '../donations/receipt.util';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertCompanyDto } from './dto/upsert-company.dto';

export interface SupportedCampaign {
  campaignId: string;
  title: string;
  schoolName: string;
  amountCents: number;
}

@Injectable()
export class SponsorsService {
  constructor(private readonly prisma: PrismaService) {}

  upsertProfile(userId: string, dto: UpsertCompanyDto) {
    return this.prisma.corporateProfile.upsert({
      where: { userId },
      update: {
        companyName: dto.companyName,
        sector: dto.sector,
        contactName: dto.contactName,
        logoUrl: dto.logoUrl,
      },
      create: {
        userId,
        companyName: dto.companyName,
        sector: dto.sector,
        contactName: dto.contactName,
        logoUrl: dto.logoUrl,
      },
    });
  }

  async impact(userId: string) {
    const profile = await this.prisma.corporateProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new DomainException('NOT_FOUND', 'Corporate profile not found', 404);
    }

    const donations = await this.prisma.donation.findMany({
      where: { corporateProfileId: profile.id, status: 'SUCCEEDED' },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { include: { school: true, studentProfile: true } },
      },
    });

    const totalCommittedCents = donations.reduce(
      (sum, d) => sum + d.amountCents,
      0,
    );

    const byCampaign = donations.reduce<Record<string, SupportedCampaign>>(
      (acc, d) => ({
        ...acc,
        [d.campaignId]: {
          campaignId: d.campaignId,
          title: d.campaign.title,
          schoolName: d.campaign.school.name,
          amountCents: (acc[d.campaignId]?.amountCents ?? 0) + d.amountCents,
        },
      }),
      {},
    );
    const campaignsSupported = Object.values(byCampaign);

    const studentsSupported = new Set(
      donations.map((d) => d.campaign.studentProfileId),
    ).size;

    return {
      totalCommittedCents,
      campaignsSupported,
      studentsSupported,
      donations,
    };
  }

  async receipt(userId: string, id: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: {
        campaign: { include: { school: true } },
        corporateProfile: true,
      },
    });
    if (!donation) {
      throw new DomainException('NOT_FOUND', 'Donation not found', 404);
    }
    if (donation.corporateProfile?.userId !== userId) {
      throw new DomainException('FORBIDDEN', 'Not your donation', 403);
    }

    return buildReceipt({
      donationId: donation.id,
      createdAt: donation.createdAt,
      companyName: donation.corporateProfile.companyName,
      amountCents: donation.amountCents,
      currency: donation.currency,
      campaignTitle: donation.campaign.title,
      schoolName: donation.campaign.school.name,
    });
  }
}
