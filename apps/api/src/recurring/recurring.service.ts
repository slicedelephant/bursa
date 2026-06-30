import { Inject, Injectable } from '@nestjs/common';
import { RecurringStatus } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { splitContribution } from '../donations/contribution.util';
import { NotificationsService } from '../notifications/notifications.service';
import { recurringChargeNotification } from '../notifications/notification-templates';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../payments/payment-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { addMonth } from './recurring-engine';

export interface RecurringRunResult {
  charged: { pledgeId: string; donationId: string; amountCents: number }[];
  failed: string[];
  cancelled: string[];
}

/**
 * SIMULATED recurring "Sponsor a Student". No real billing/mandate: a run
 * charges each due pledge through the PaymentProvider (mock or Stripe) and
 * records a normal immediate-success donation — decoupled from the E2
 * all-or-nothing pledge/capture path.
 */
@Injectable()
export class RecurringService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    private readonly notifications: NotificationsService,
  ) {}

  async create(donorUserId: string, dto: CreateRecurringDto) {
    const campaign = await this.loadLiveCampaign(dto.campaignId);
    const pledge = await this.prisma.recurringPledge.create({
      data: {
        donorUserId,
        campaignId: campaign.id,
        amountCents: dto.amountCents,
        currency: campaign.currency,
        nextRunAt: new Date(),
      },
    });
    await this.notifications.subscribe(donorUserId, campaign.id);
    return pledge;
  }

  list(donorUserId: string) {
    return this.prisma.recurringPledge.findMany({
      where: { donorUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: {
            title: true,
            studentProfile: { select: { fullName: true } },
          },
        },
      },
    });
  }

  pause(donorUserId: string, id: string) {
    return this.setStatus(donorUserId, id, 'PAUSED');
  }

  resume(donorUserId: string, id: string) {
    return this.setStatus(donorUserId, id, 'ACTIVE');
  }

  cancel(donorUserId: string, id: string) {
    return this.setStatus(donorUserId, id, 'CANCELLED');
  }

  async runDue(
    donorUserId: string,
    now: Date = new Date(),
  ): Promise<RecurringRunResult> {
    const pledges = await this.prisma.recurringPledge.findMany({
      where: { donorUserId, status: 'ACTIVE', nextRunAt: { lte: now } },
      include: { donorUser: { select: { displayName: true } } },
    });

    const result: RecurringRunResult = {
      charged: [],
      failed: [],
      cancelled: [],
    };

    for (const pledge of pledges) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: pledge.campaignId },
        include: { verification: true, studentProfile: true },
      });

      const donatable =
        campaign &&
        campaign.verification?.status === 'VERIFIED' &&
        campaign.status === 'LIVE' &&
        campaign.raisedCents < campaign.goalCents;

      if (!donatable) {
        await this.prisma.recurringPledge.update({
          where: { id: pledge.id },
          data: { status: 'CANCELLED' },
        });
        result.cancelled.push(pledge.id);
        continue;
      }

      const charge = await this.payments.createCardCharge({
        amountCents: pledge.amountCents,
        currency: pledge.currency,
        method: 'CARD',
        description: `Recurring charge for pledge ${pledge.id}`,
      });
      if (charge.status !== 'SUCCEEDED') {
        result.failed.push(pledge.id);
        continue;
      }

      const { amountToGoal, tip } = splitContribution(
        campaign.goalCents,
        campaign.raisedCents,
        pledge.amountCents,
      );
      const donation = await this.applyCharge(
        pledge,
        campaign,
        amountToGoal,
        tip,
        charge.reference,
        now,
      );
      result.charged.push({
        pledgeId: pledge.id,
        donationId: donation.id,
        amountCents: pledge.amountCents,
      });

      await this.notifications.deliver(
        pledge.donorUserId,
        recurringChargeNotification({
          studentName: campaign.studentProfile.fullName,
          amountCents: pledge.amountCents,
        }),
        campaign.id,
        { email: true },
      );
      await this.notifications.onDonation({
        donorUserId: null,
        campaignId: campaign.id,
        studentName: campaign.studentProfile.fullName,
        amountCents: pledge.amountCents,
        prevRaised: campaign.raisedCents,
        newRaised: campaign.raisedCents + amountToGoal,
        goalCents: campaign.goalCents,
      });
    }

    return result;
  }

  private async applyCharge(
    pledge: {
      id: string;
      donorUserId: string;
      amountCents: number;
      chargesCount: number;
      totalChargedCents: number;
      donorUser?: { displayName: string } | null;
    },
    campaign: {
      id: string;
      goalCents: number;
      raisedCents: number;
      tipsCents: number;
      status: string;
    },
    amountToGoal: number,
    tip: number,
    providerRef: string,
    now: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          campaignId: campaign.id,
          donorUserId: pledge.donorUserId,
          recurringPledgeId: pledge.id,
          amountCents: amountToGoal,
          tipCents: tip,
          method: 'CARD',
          type: 'PRIVATE',
          status: 'SUCCEEDED',
          providerRef,
          donorName: pledge.donorUser?.displayName ?? null,
        },
      });

      const newRaised = campaign.raisedCents + amountToGoal;
      const funded = campaign.goalCents > 0 && newRaised >= campaign.goalCents;

      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          raisedCents: newRaised,
          tipsCents: campaign.tipsCents + tip,
          ...(funded && campaign.status !== 'FUNDED'
            ? { status: 'FUNDED' }
            : {}),
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

      await tx.recurringPledge.update({
        where: { id: pledge.id },
        data: {
          chargesCount: pledge.chargesCount + 1,
          totalChargedCents: pledge.totalChargedCents + pledge.amountCents,
          lastChargedAt: now,
          nextRunAt: addMonth(now),
        },
      });

      return donation;
    });
  }

  private async setStatus(
    donorUserId: string,
    id: string,
    status: RecurringStatus,
  ) {
    await this.owned(donorUserId, id);
    return this.prisma.recurringPledge.update({
      where: { id },
      data: { status },
    });
  }

  private async owned(donorUserId: string, id: string) {
    const pledge = await this.prisma.recurringPledge.findUnique({
      where: { id },
    });
    if (!pledge) {
      throw new DomainException('NOT_FOUND', 'Recurring pledge not found', 404);
    }
    if (pledge.donorUserId !== donorUserId) {
      throw new DomainException('FORBIDDEN', 'Not your recurring pledge', 403);
    }
    return pledge;
  }

  private async loadLiveCampaign(campaignId: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { verification: true },
    });
    if (!c || c.verification?.status !== 'VERIFIED' || c.status !== 'LIVE') {
      throw new DomainException(
        'VALIDATION_ERROR',
        'You can only set up recurring giving for a live, verified campaign',
      );
    }
    return c;
  }
}
