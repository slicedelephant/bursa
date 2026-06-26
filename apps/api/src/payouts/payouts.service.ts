import { Inject, Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../payments/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
  ) {}

  async disburse(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { school: true, payout: true },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }
    if (campaign.status !== 'FUNDED') {
      throw new DomainException(
        'PAYOUT_NOT_ALLOWED',
        'Only a fully funded campaign can be disbursed',
        409,
      );
    }
    if (!campaign.school.payoutVerified) {
      throw new DomainException(
        'SCHOOL_NOT_VERIFIED',
        'The school has no verified payout account',
        409,
      );
    }
    if (campaign.payout) {
      throw new DomainException(
        'ALREADY_PAID_OUT',
        'This campaign has already been paid out',
        409,
      );
    }

    const result = await this.payments.createPayout({
      amountCents: campaign.raisedCents,
      currency: campaign.currency,
      schoolName: campaign.school.name,
      accountRef: campaign.school.payoutAccountRef ?? 'mock-account',
      description: `Tuition disbursement for campaign ${campaign.id}`,
    });

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          campaignId: campaign.id,
          schoolId: campaign.schoolId,
          amountCents: campaign.raisedCents,
          method: 'SEPA',
          reference: result.reference,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      await tx.campaign.update({
        where: { id: campaign.id },
        data: { status: 'DISBURSED' },
      });

      await tx.campaignUpdate.create({
        data: {
          campaignId: campaign.id,
          title: 'Funds disbursed to school',
          body: `The raised tuition has been paid directly to ${campaign.school.name}.`,
          type: 'SYSTEM',
        },
      });

      return payout;
    });
  }

  listPayouts() {
    return this.prisma.payout.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { include: { studentProfile: true } },
        school: true,
      },
    });
  }
}
