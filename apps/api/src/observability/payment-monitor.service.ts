import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { derivePaymentAlerts, PaymentAlert } from './payment-alerts';

const RECENT_CARD_SAMPLE = 25;
const STUCK_PLEDGE_HOURS = 72;

/**
 * Read-only payment/webhook health. Derives alerts from the existing Donation
 * table (no extra instrumentation, no touching the money path) plus the in-memory
 * request metrics for webhook delivery failures. All thresholds live in the pure
 * `derivePaymentAlerts` core.
 */
@Injectable()
export class PaymentMonitorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  async alerts(
    now: Date = new Date(),
    recentSample: number = RECENT_CARD_SAMPLE,
  ): Promise<{ alerts: readonly PaymentAlert[] }> {
    // Operator may widen the card lookback window; guard against non-positive input.
    const take = recentSample > 0 ? recentSample : RECENT_CARD_SAMPLE;
    const recentCards = await this.prisma.donation.findMany({
      where: { method: 'CARD' },
      orderBy: { createdAt: 'desc' },
      take,
      select: { status: true },
    });
    const cardRecent = recentCards.length;
    const cardFailed = recentCards.filter((d) => d.status === 'FAILED').length;

    const cutoff = new Date(now.getTime() - STUCK_PLEDGE_HOURS * 3_600_000);
    const stuckPledges = await this.prisma.donation.count({
      where: { status: 'PLEDGED', createdAt: { lt: cutoff } },
    });

    const webhookFailures = this.metrics.webhookFailures();

    return {
      alerts: derivePaymentAlerts({
        cardRecent,
        cardFailed,
        stuckPledges,
        webhookFailures,
      }),
    };
  }
}
