import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { AnalyticsService } from '../observability/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { detectCardTesting } from './card-testing';
import { scoreDonorRisk } from './donor-risk';
import { aggregateFraudScore } from './fraud-score';
import { decideDonorFreeze } from './auto-freeze';
import { exceedsVelocity } from './velocity-tracker';
import { ScoreTransactionDto } from './dto/score-transaction.dto';

const RECENT_SAMPLE = 25;

/**
 * Per-transaction fraud scoring (E9). Deterministic heuristic only (no ML). The
 * resulting signal is persisted, fed best-effort into the reused E7 analytics
 * stream, and may auto-freeze a donor account on a failed+chargeback pattern.
 * A freeze sets a status flag only — the money path is untouched.
 */
@Injectable()
export class FraudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  /** Lists logged fraud signals, optionally filtered by donor or kind. */
  listSignals(filter: { donorUserId?: string; kind?: string; take?: number }) {
    return this.prisma.fraudSignal.findMany({
      where: {
        ...(filter.donorUserId ? { donorUserId: filter.donorUserId } : {}),
        ...(filter.kind ? { kind: filter.kind } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filter.take && filter.take > 0 ? filter.take : 50,
    });
  }

  /**
   * Recomputes the fraud score for a transaction, persists a FraudSignal and
   * checks the donor auto-freeze pattern.
   */
  async scoreTransaction(
    donationId: string,
    dto: ScoreTransactionDto = {},
    now: Date = new Date(),
  ) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
    });
    if (!donation) {
      throw new DomainException('NOT_FOUND', 'Donation not found', 404);
    }

    const donorUserId = donation.donorUserId ?? undefined;
    const recent = donorUserId
      ? await this.prisma.donation.findMany({
          where: { donorUserId },
          select: { status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: RECENT_SAMPLE,
        })
      : [{ status: donation.status, createdAt: donation.createdAt }];

    const cardTesting = detectCardTesting(
      recent.map((d) => ({ status: d.status, createdAt: d.createdAt })),
      now,
    );
    const velocity = exceedsVelocity(
      recent.map((d) => d.createdAt),
      now,
    );
    const failedRecentCount = recent.filter((d) => d.status === 'FAILED').length;

    const donorRisk = scoreDonorRisk({
      country: donation.donorCountry,
      amountCents: donation.amountCents,
      recentDonationCount: velocity.count,
      cardType: dto.cardType,
      failedRecentCount,
    });

    const aggregate = aggregateFraudScore([
      { score: cardTesting.score, reasons: cardTesting.reasons },
      { score: donorRisk.score, reasons: donorRisk.reasons },
    ]);

    const kind = this.primaryKind(cardTesting.flagged, donorRisk.reasons, velocity.exceeded);

    const signal = await this.prisma.fraudSignal.create({
      data: {
        kind,
        score: aggregate.score,
        riskLevel: aggregate.level,
        reasons: aggregate.reasons as unknown as Prisma.InputJsonValue,
        donationId: donation.id,
        donorUserId,
        campaignId: donation.campaignId,
      },
    });

    let donorFrozen = false;
    if (donorUserId) {
      const chargebackCount = await this.prisma.chargeback.count({
        where: { donation: { donorUserId } },
      });
      const freeze = decideDonorFreeze({
        failedCount: failedRecentCount,
        chargebackCount,
      });
      await this.prisma.user.update({
        where: { id: donorUserId },
        data: {
          riskScore: donorRisk.score,
          riskLevel: donorRisk.level,
          ...(freeze.freeze
            ? {
                frozen: true,
                frozenAt: now,
                freezeReason: freeze.reason,
              }
            : {}),
        },
      });
      donorFrozen = freeze.freeze;
    }

    await this.analytics.record({
      type: 'trust.fraud_signal',
      userId: donorUserId ?? null,
      campaignId: donation.campaignId,
      metadata: { kind, score: aggregate.score, level: aggregate.level },
    });

    return { signal, donorFrozen };
  }

  private primaryKind(
    cardFlagged: boolean,
    donorReasons: readonly string[],
    velocityExceeded: boolean,
  ): string {
    if (cardFlagged) return 'CARD_TESTING';
    if (donorReasons.includes('high_value')) return 'HIGH_VALUE';
    if (velocityExceeded) return 'VELOCITY';
    return 'DONOR_RISK';
  }
}
