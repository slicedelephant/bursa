import { Inject, Injectable } from '@nestjs/common';
import { Campaign } from '@prisma/client';
import { percentOf, toPublicDonation } from '../campaigns/campaign.mapper';
import { DomainException } from '../common/domain.exception';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../payments/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CardDonationDto } from './dto/card-donation.dto';
import { SepaDonationDto } from './dto/sepa-donation.dto';
import { isGoalReached, summarizeCapture } from './pledge-engine';
import { buildReceipt } from './receipt.util';

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  /**
   * All-or-Nothing card flow: the donor's payment method + SCA are saved up
   * front (savePledge) but NOT charged. The pledge counts toward the goal. Only
   * when the goal is reached are all pledges charged off_session (captured) and
   * receipts issued. If the goal is never reached, no card is ever debited.
   */
  async donateCard(campaignId: string, dto: CardDonationDto) {
    const campaign = await this.loadDonatable(campaignId);
    const { amountToGoal, tip } = this.split(
      campaign,
      dto.amountCents,
      dto.tipCents ?? 0,
    );
    const total = dto.amountCents + (dto.tipCents ?? 0);

    const pledge = await this.payments.savePledge({
      amountCents: total,
      currency: campaign.currency,
      method: 'CARD',
      description: `Pledge to campaign ${campaign.id}`,
    });

    if (pledge.status === 'FAILED') {
      await this.prisma.donation.create({
        data: {
          campaignId,
          amountCents: dto.amountCents,
          tipCents: dto.tipCents ?? 0,
          method: 'CARD',
          type: 'PRIVATE',
          status: 'FAILED',
          providerRef: pledge.pledgeRef,
          message: dto.message,
          anonymous: dto.anonymous ?? false,
          donorName: dto.donorName,
        },
      });
      throw new DomainException(
        'PAYMENT_FAILED',
        pledge.failureReason ?? 'Card could not be authorized',
        402,
      );
    }

    const { donation, campaign: updated, funded } = await this.recordPledge(
      campaign,
      {
        amountToGoal,
        tip,
        pledgeRef: pledge.pledgeRef,
        message: dto.message,
        anonymous: dto.anonymous ?? false,
        donorName: dto.donorName,
      },
    );

    if (!funded) {
      return { donation, campaign: this.publicProgress(updated) };
    }

    const captured = await this.captureCampaign(updated.id);
    const finalDonation = await this.prisma.donation.findUnique({
      where: { id: donation.id },
    });
    const receipt = (finalDonation?.status ?? donation.status) === 'CAPTURED'
      ? this.receiptFor(campaign, finalDonation ?? donation)
      : undefined;

    return {
      donation: finalDonation ?? donation,
      campaign: this.publicProgress({ ...updated, status: 'FUNDED' }),
      capture: captured,
      ...(receipt ? { receipt } : {}),
    };
  }

  async donateSepa(campaignId: string, userId: string, dto: SepaDonationDto) {
    const campaign = await this.loadDonatable(campaignId);
    const corp = await this.prisma.corporateProfile.findUnique({
      where: { userId },
    });
    if (!corp) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'Create your company profile before pledging',
      );
    }
    const { amountToGoal, tip } = this.split(campaign, dto.amountCents, 0);

    const result = await this.payments.createSepaPledge({
      amountCents: dto.amountCents,
      currency: campaign.currency,
      method: 'SEPA',
      description: `Corporate pledge to campaign ${campaign.id}`,
    });

    if (result.status === 'FAILED') {
      await this.prisma.donation.create({
        data: {
          campaignId,
          corporateProfileId: corp.id,
          amountCents: dto.amountCents,
          method: 'SEPA',
          type: 'CORPORATE',
          status: 'FAILED',
          providerRef: result.reference,
          message: dto.message,
        },
      });
      throw new DomainException(
        'PAYMENT_FAILED',
        result.failureReason ?? 'SEPA pledge failed',
        402,
      );
    }

    const recorded = await this.recordSuccess(campaign, {
      amountToGoal,
      tip,
      providerRef: result.reference,
      message: dto.message,
      corporateProfileId: corp.id,
      donorName: corp.companyName,
    });

    const school = await this.prisma.school.findUnique({
      where: { id: campaign.schoolId },
    });
    const receipt = buildReceipt({
      donationId: recorded.donation.id,
      createdAt: recorded.donation.createdAt,
      companyName: corp.companyName,
      amountCents: recorded.donation.amountCents,
      currency: campaign.currency,
      campaignTitle: campaign.title,
      schoolName: school?.name ?? 'School',
    });

    return { ...recorded, receipt };
  }

  async listDonations(campaignId: string) {
    const donations = await this.prisma.donation.findMany({
      where: { campaignId, status: { in: ['SUCCEEDED', 'PLEDGED', 'CAPTURED'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { corporateProfile: { select: { companyName: true } } },
    });
    return donations.map(toPublicDonation);
  }

  /**
   * Goal reached: charge every outstanding pledge off_session and mark it
   * CAPTURED. This is the only place a private donor's card is debited.
   */
  async captureCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }
    const pledges = await this.prisma.donation.findMany({
      where: { campaignId, status: 'PLEDGED' },
    });

    const captureRefs = new Map<string, string>();
    for (const pledge of pledges) {
      if (!pledge.pledgeRef) continue;
      const result = await this.payments.captureOnGoalReached({
        pledgeRef: pledge.pledgeRef,
        amountCents: pledge.amountCents + pledge.tipCents,
        currency: campaign.currency,
        description: `Capture for campaign ${campaignId}`,
      });
      if (result.status === 'SUCCEEDED') {
        captureRefs.set(pledge.id, result.reference);
      }
    }

    const summary = summarizeCapture(
      pledges.map((p) => ({ id: p.id, amountCents: p.amountCents, pledgeRef: p.pledgeRef })),
      (p) => captureRefs.get(p.id) ?? null,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const id of summary.capturedIds) {
        await tx.donation.update({
          where: { id },
          data: {
            status: 'CAPTURED',
            capturedAt: new Date(),
            providerRef: captureRefs.get(id),
          },
        });
      }
      const alreadyAnnounced = await tx.campaignUpdate.findFirst({
        where: { campaignId, title: 'Goal reached' },
      });
      if (!alreadyAnnounced) {
        await tx.campaignUpdate.create({
          data: {
            campaignId,
            title: 'Goal reached',
            body: 'This campaign reached its tuition goal — every pledge has now been charged and the tuition is on its way directly to the school. Thank you!',
            type: 'SYSTEM',
          },
        });
      }
    });

    return summary;
  }

  /** Over-funding rule: cap the goal-bound amount at the remaining gap; excess becomes a tip. */
  private split(campaign: Campaign, amountCents: number, tipCents: number) {
    const remaining = campaign.goalCents - campaign.raisedCents;
    let amountToGoal = amountCents;
    let tip = tipCents;
    if (amountToGoal > remaining) {
      tip += amountToGoal - remaining;
      amountToGoal = remaining;
    }
    return { amountToGoal, tip };
  }

  private async recordPledge(
    campaign: Campaign,
    input: {
      amountToGoal: number;
      tip: number;
      pledgeRef: string;
      message?: string;
      anonymous: boolean;
      donorName?: string;
    },
  ) {
    const newRaised = campaign.raisedCents + input.amountToGoal;
    const funded = isGoalReached(newRaised, campaign.goalCents);

    const { donation, updated } = await this.prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          campaignId: campaign.id,
          amountCents: input.amountToGoal,
          tipCents: input.tip,
          method: 'CARD',
          type: 'PRIVATE',
          status: 'PLEDGED',
          pledgeRef: input.pledgeRef,
          message: input.message,
          anonymous: input.anonymous,
          donorName: input.donorName,
        },
      });

      const updated = await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          raisedCents: newRaised,
          tipsCents: campaign.tipsCents + input.tip,
          ...(funded && campaign.status !== 'FUNDED' ? { status: 'FUNDED' } : {}),
        },
      });

      return { donation, updated };
    });

    return { donation, campaign: updated, funded };
  }

  private async recordSuccess(
    campaign: Campaign,
    input: {
      amountToGoal: number;
      tip: number;
      providerRef: string;
      message?: string;
      donorName?: string;
      corporateProfileId?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          campaignId: campaign.id,
          corporateProfileId: input.corporateProfileId,
          amountCents: input.amountToGoal,
          tipCents: input.tip,
          method: 'SEPA',
          type: 'CORPORATE',
          status: 'SUCCEEDED',
          providerRef: input.providerRef,
          message: input.message,
          anonymous: false,
          donorName: input.donorName,
        },
      });

      const newRaised = campaign.raisedCents + input.amountToGoal;
      const funded = isGoalReached(newRaised, campaign.goalCents);

      const updated = await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          raisedCents: newRaised,
          tipsCents: campaign.tipsCents + input.tip,
          ...(funded && campaign.status !== 'FUNDED' ? { status: 'FUNDED' } : {}),
        },
      });

      if (funded && campaign.status !== 'FUNDED') {
        await tx.campaignUpdate.create({
          data: {
            campaignId: campaign.id,
            title: 'Goal reached',
            body: 'This campaign reached its tuition goal. Thank you to every supporter who helped close the gap!',
            type: 'SYSTEM',
          },
        });
      }

      return { donation, campaign: this.publicProgress(updated) };
    });
  }

  private receiptFor(
    campaign: Campaign,
    donation: { id: string; createdAt: Date; amountCents: number; donorName: string | null },
  ) {
    return buildReceipt({
      donationId: donation.id,
      createdAt: donation.createdAt,
      companyName: donation.donorName ?? 'A supporter',
      amountCents: donation.amountCents,
      currency: campaign.currency,
      campaignTitle: campaign.title,
      schoolName: 'the business school',
    });
  }

  private publicProgress(c: Campaign) {
    return {
      id: c.id,
      status: c.status,
      goalCents: c.goalCents,
      raisedCents: c.raisedCents,
      tipsCents: c.tipsCents,
      currency: c.currency,
      percent: percentOf(c.raisedCents, c.goalCents),
    };
  }

  private async loadDonatable(campaignId: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { verification: true },
    });
    if (
      !c ||
      c.verification?.status !== 'VERIFIED' ||
      !['LIVE', 'FUNDED', 'DISBURSED'].includes(c.status)
    ) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }
    if (c.status !== 'LIVE') {
      throw new DomainException(
        'CAMPAIGN_FULLY_FUNDED',
        'This campaign is no longer accepting donations',
        409,
      );
    }
    if (c.raisedCents >= c.goalCents) {
      throw new DomainException(
        'CAMPAIGN_FULLY_FUNDED',
        'This campaign is already fully funded',
        409,
      );
    }
    return c;
  }
}
