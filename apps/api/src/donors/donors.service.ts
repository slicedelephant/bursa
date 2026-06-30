import { Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { buildReceipt } from '../donations/receipt.util';
import { tributeLine } from '../donations/tribute.util';
import { PrismaService } from '../prisma/prisma.service';

const COUNTED = ['PLEDGED', 'CAPTURED', 'SUCCEEDED'];

@Injectable()
export class DonorsService {
  constructor(private readonly prisma: PrismaService) {}

  async history(donorUserId: string) {
    const [donations, activeRecurringCount] = await Promise.all([
      this.prisma.donation.findMany({
        where: { donorUserId },
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: { title: true, school: { select: { name: true } } },
          },
        },
      }),
      this.prisma.recurringPledge.count({
        where: { donorUserId, status: 'ACTIVE' },
      }),
    ]);

    const rows = donations.map((d) => ({
      id: d.id,
      campaignId: d.campaignId,
      campaignTitle: d.campaign.title,
      schoolName: d.campaign.school.name,
      amountCents: d.amountCents,
      currency: d.currency,
      status: d.status,
      method: d.method,
      tribute: tributeLine(d.tributeType, d.tributeName),
      anonymous: d.anonymous,
      recurring: d.recurringPledgeId !== null,
      createdAt: d.createdAt,
    }));

    const counted = rows.filter((r) => COUNTED.includes(r.status));
    const totalDonatedCents = counted.reduce(
      (sum, r) => sum + r.amountCents,
      0,
    );
    const campaignsSupported = new Set(counted.map((r) => r.campaignId)).size;

    return {
      summary: {
        totalDonatedCents,
        donationCount: counted.length,
        campaignsSupported,
        repeatDonor: counted.length >= 2,
        activeRecurringCount,
      },
      donations: rows,
    };
  }

  async receipt(donorUserId: string, donationId: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        campaign: { include: { school: true } },
        donorUser: { select: { displayName: true } },
      },
    });
    if (!donation) {
      throw new DomainException('NOT_FOUND', 'Donation not found', 404);
    }
    if (donation.donorUserId !== donorUserId) {
      throw new DomainException('FORBIDDEN', 'Not your donation', 403);
    }

    return buildReceipt({
      donationId: donation.id,
      createdAt: donation.createdAt,
      companyName:
        donation.donorName ?? donation.donorUser?.displayName ?? 'A supporter',
      amountCents: donation.amountCents,
      currency: donation.currency,
      campaignTitle: donation.campaign.title,
      schoolName: donation.campaign.school.name,
    });
  }
}
