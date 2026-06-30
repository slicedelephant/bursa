import { Injectable } from '@nestjs/common';
import { DonationStatus, Prisma } from '@prisma/client';
import { percentOf } from '../campaigns/campaign.mapper';
import { buildSimplePdf } from '../corporate/pdf.util';
import { monthlyGivingBadge } from '../gamification/badge.util';
import {
  ContributionInput,
  aggregateContributions,
} from '../gamification/cumulative.util';
import { comparePeers } from '../gamification/peer-comparison.util';
import { computeMonthlyStreak } from '../gamification/streak.util';
import { PrismaService } from '../prisma/prisma.service';
import { portfolioPdfLines, toPortfolioCsv } from './portfolio-export.util';
import { PortfolioItem, PortfolioView } from './portfolio.types';

/** Donation statuses that count toward the portfolio (mirrors E4 DonorsService). */
const COUNTED: DonationStatus[] = [
  DonationStatus.PLEDGED,
  DonationStatus.CAPTURED,
  DonationStatus.SUCCEEDED,
];

/** The campaign/student fields the portfolio reads for each supported student. */
const PORTFOLIO_DONATION_INCLUDE = {
  campaign: {
    select: {
      title: true,
      raisedCents: true,
      goalCents: true,
      status: true,
      verification: { select: { status: true } },
      school: { select: { name: true } },
      studentProfile: {
        select: { fullName: true, photoUrl: true, country: true },
      },
    },
  },
} satisfies Prisma.DonationInclude;

type DonationWithCampaign = Prisma.DonationGetPayload<{
  include: typeof PORTFOLIO_DONATION_INCLUDE;
}>;

/**
 * Builds the donor portfolio ("My students") plus streak, badge, cumulative stats
 * and a light peer comparison. All values are derived on read from existing
 * donations — no new persistence, no money movement (read-only; "donate again"
 * routes back into the verified campaign donation path). The gamification logic
 * lives in the reusable, donation-free primitives under ../gamification.
 */
@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async portfolio(
    donorUserId: string,
    referenceDate: Date = new Date(),
  ): Promise<PortfolioView> {
    const [donations, population] = await Promise.all([
      this.prisma.donation.findMany({
        where: { donorUserId, status: { in: COUNTED } },
        orderBy: { createdAt: 'desc' },
        include: PORTFOLIO_DONATION_INCLUDE,
      }),
      this.prisma.donation.groupBy({
        by: ['donorUserId', 'campaignId'],
        where: { donorUserId: { not: null }, status: { in: COUNTED } },
      }),
    ]);

    const items = this.buildItems(donations);

    const contributions: ContributionInput[] = donations.map((d) => ({
      targetId: d.campaignId,
      valueCents: d.amountCents,
      at: d.createdAt,
    }));
    const stats = aggregateContributions(contributions);

    const streak = computeMonthlyStreak(
      donations.map((d) => d.createdAt),
      referenceDate,
    );
    const badge = monthlyGivingBadge(streak.currentMonths);

    const peer = comparePeers(items.length, this.peerSupportCounts(population));

    return { items, streak, badge, stats, peer };
  }

  async portfolioCsv(donorUserId: string): Promise<string> {
    const view = await this.portfolio(donorUserId);
    return toPortfolioCsv(view);
  }

  async portfolioPdf(donorUserId: string): Promise<string> {
    const view = await this.portfolio(donorUserId);
    return buildSimplePdf('Bursa Donor Portfolio', portfolioPdfLines(view));
  }

  /** Collapses per-donation rows into one portfolio card per supported campaign. */
  private buildItems(
    donations: ReadonlyArray<DonationWithCampaign>,
  ): PortfolioItem[] {
    const byCampaign = new Map<string, PortfolioItem>();
    for (const d of donations) {
      const existing = byCampaign.get(d.campaignId);
      if (existing) {
        byCampaign.set(d.campaignId, {
          ...existing,
          yourContributionCents: existing.yourContributionCents + d.amountCents,
        });
        continue;
      }
      const c = d.campaign;
      byCampaign.set(d.campaignId, {
        campaignId: d.campaignId,
        studentName: c.studentProfile?.fullName ?? 'A student',
        photoUrl: c.studentProfile?.photoUrl ?? null,
        country: c.studentProfile?.country ?? '',
        schoolName: c.school.name,
        campaignTitle: c.title,
        raisedCents: c.raisedCents,
        goalCents: c.goalCents,
        percent: percentOf(c.raisedCents, c.goalCents),
        verified: c.verification?.status === 'VERIFIED',
        yourContributionCents: d.amountCents,
        canDonateAgain: c.status === 'LIVE',
      });
    }
    return [...byCampaign.values()];
  }

  /** Distinct supported campaigns per donor, as a population for the peer average. */
  private peerSupportCounts(
    population: ReadonlyArray<{ donorUserId: string | null }>,
  ): number[] {
    const counts = new Map<string, number>();
    for (const row of population) {
      if (!row.donorUserId) continue;
      counts.set(row.donorUserId, (counts.get(row.donorUserId) ?? 0) + 1);
    }
    return [...counts.values()];
  }
}
