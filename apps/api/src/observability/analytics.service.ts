import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { redact } from '../security/pii-redact';
import { buildFunnel, FunnelReport } from './funnel';
import {
  DONATION_FUNNEL,
  ONBOARDING_EVENT,
  ONBOARDING_FUNNEL,
} from './funnel-steps';

export interface TrackEventInput {
  readonly type: string;
  readonly visitorId?: string | null;
  readonly sessionId?: string | null;
  readonly userId?: string | null;
  readonly campaignId?: string | null;
  readonly path?: string | null;
  readonly step?: string | null;
  readonly requestId?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}

/**
 * Privacy-aware product/funnel analytics. Events are append-only; `metadata` is
 * PII-redacted before it is persisted (no email/token/card data ever lands here).
 * Recording must never break the caller (fire-and-forget), so persistence errors
 * are caught and logged, not rethrown — analytics never blocks a business flow.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: TrackEventInput): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          type: event.type,
          visitorId: event.visitorId ?? null,
          sessionId: event.sessionId ?? null,
          userId: event.userId ?? null,
          campaignId: event.campaignId ?? null,
          path: event.path ?? null,
          step: event.step ?? null,
          requestId: event.requestId ?? null,
          metadata: event.metadata
            ? (redact(event.metadata) as object)
            : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record analytics event "${event.type}"`,
        error as Error,
      );
    }
  }

  /** Donation funnel (optionally scoped to one campaign). */
  async funnel(campaignId?: string): Promise<FunnelReport> {
    const grouped = await this.prisma.analyticsEvent.groupBy({
      by: ['type'],
      where: campaignId ? { campaignId } : undefined,
      _count: { _all: true },
    });
    const counts = this.toCounts(grouped, 'type');
    return buildFunnel(counts, DONATION_FUNNEL);
  }

  /** Onboarding funnel from `onboarding_step` events grouped by step. */
  async onboardingFunnel(): Promise<FunnelReport> {
    const grouped = await this.prisma.analyticsEvent.groupBy({
      by: ['step'],
      where: { type: ONBOARDING_EVENT },
      _count: { _all: true },
    });
    const counts = this.toCounts(grouped, 'step');
    return buildFunnel(counts, ONBOARDING_FUNNEL);
  }

  private toCounts(
    grouped: ReadonlyArray<Record<string, unknown>>,
    key: 'type' | 'step',
  ): Record<string, number> {
    return grouped.reduce<Record<string, number>>((acc, row) => {
      const k = row[key];
      const count = (row['_count'] as { _all?: number } | undefined)?._all ?? 0;
      if (typeof k === 'string') acc[k] = count;
      return acc;
    }, {});
  }
}
