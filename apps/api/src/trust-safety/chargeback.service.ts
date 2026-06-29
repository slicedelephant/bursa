import { Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { AnalyticsService } from '../observability/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { decideCampaignFreeze } from './auto-freeze';
import {
  canOfferRefund,
  canSubmitEvidence,
  nextChargebackStatus,
} from './chargeback-rules';

/** Minimal Stripe-style chargeback (charge.dispute.created) event shape. */
export interface ChargebackEvent {
  readonly id?: string;
  readonly type?: string;
  readonly data?: {
    readonly object?: {
      readonly id?: string;
      readonly amount?: number;
      readonly currency?: string;
      readonly reason?: string;
      readonly metadata?: {
        readonly campaignId?: string;
        readonly donationId?: string;
      };
    };
  };
}

/**
 * Dispute & chargeback management (E9). Fed by (mocked) Stripe webhook events
 * that the E6 signature guard has already verified. Idempotent over the dispute
 * id; auto-freezes a campaign at 3+ chargebacks. No real refund ever runs — the
 * refund offer is only a status (Constitution III).
 */
@Injectable()
export class ChargebackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  list(status?: string) {
    return this.prisma.chargeback.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Ingests a verified chargeback webhook event. Idempotent per dispute id. */
  async ingest(event: ChargebackEvent, now: Date = new Date()) {
    const dispute = event.data?.object;
    if (!dispute?.id) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'Invalid chargeback event payload',
        400,
      );
    }

    const existing = await this.prisma.chargeback.findUnique({
      where: { providerEventId: dispute.id },
    });
    if (existing) {
      // Duplicate webhook delivery — return the existing case, do nothing else.
      return {
        received: true,
        chargebackId: existing.id,
        campaignFrozen: false,
        idempotent: true,
      };
    }

    const campaignId = dispute.metadata?.campaignId ?? null;
    const created = await this.prisma.chargeback.create({
      data: {
        providerEventId: dispute.id,
        donationId: dispute.metadata?.donationId ?? null,
        campaignId,
        amountCents: dispute.amount ?? 0,
        currency: (dispute.currency ?? 'eur').toUpperCase(),
        reason: dispute.reason ?? 'unknown',
      },
    });

    let campaignFrozen = false;
    if (campaignId) {
      const chargebackCount = await this.prisma.chargeback.count({
        where: { campaignId },
      });
      const freeze = decideCampaignFreeze(chargebackCount);
      if (freeze.freeze) {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: {
            frozen: true,
            frozenAt: now,
            freezeReason: freeze.reason,
          },
        });
        campaignFrozen = true;
      }
    }

    await this.analytics.record({
      type: 'trust.chargeback',
      campaignId,
      metadata: { reason: created.reason, amountCents: created.amountCents },
    });

    return {
      received: true,
      chargebackId: created.id,
      campaignFrozen,
      idempotent: false,
    };
  }

  async submitEvidence(id: string, note: string) {
    const chargeback = await this.loadOpenable(id);
    if (!canSubmitEvidence(chargeback.status)) {
      throw new DomainException(
        'CHARGEBACK_NOT_OPEN',
        'Evidence can only be submitted for an open dispute',
        409,
      );
    }
    return this.prisma.chargeback.update({
      where: { id },
      data: {
        evidenceNote: note,
        status: nextChargebackStatus(chargeback.status, 'SUBMIT_EVIDENCE'),
      },
    });
  }

  async offerRefund(id: string) {
    const chargeback = await this.loadOpenable(id);
    if (!canOfferRefund(chargeback.status, chargeback.amountCents)) {
      throw new DomainException(
        'REFUND_NOT_ELIGIBLE',
        'Only an open, low-value dispute is eligible for an auto-refund offer',
        409,
      );
    }
    return this.prisma.chargeback.update({
      where: { id },
      data: {
        refundOffered: true,
        status: nextChargebackStatus(chargeback.status, 'OFFER_REFUND'),
      },
    });
  }

  private async loadOpenable(id: string) {
    const chargeback = await this.prisma.chargeback.findUnique({
      where: { id },
    });
    if (!chargeback) {
      throw new DomainException('NOT_FOUND', 'Chargeback not found', 404);
    }
    return chargeback;
  }
}
