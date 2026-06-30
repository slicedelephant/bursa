import { Injectable, Logger } from '@nestjs/common';
import { AdvocateInvite, DonationStatus } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { InviteAdvocateDto } from './dto/invite-advocate.dto';
import { resolveAttribution } from './referral-attribution.util';
import { createReferralCode, hashReferralCode } from './referral-code.util';
import {
  buildAdvocateLeaderboard,
  buildReferralLeaderboard,
} from './referral-leaderboard.util';
import { computeReferralStats } from './referral-stats.util';
import { referralReward } from './reward-tier.util';
import { buildShareTemplates } from './share-template.util';
import {
  AdvocateDashboardView,
  AdvocateRowView,
  CreatedAdvocateView,
  DonorReferralView,
  LeaderboardView,
} from './referral.types';

/** Donation statuses that count as a referral conversion (mirrors E4). */
const COUNTED: DonationStatus[] = [
  DonationStatus.PLEDGED,
  DonationStatus.CAPTURED,
  DonationStatus.SUCCEEDED,
];

const MAX_ADVOCATES_PER_CAMPAIGN = 15;
const SHARE_BASE_URL = process.env.WEB_BASE_URL ?? 'https://bursa.app';

/**
 * Referral & advocate engine (E15). One engine, two faces:
 *  - donor referrals (E4 account) and student advocates (per campaign).
 * Reuses the E16 gamification primitives (rankLeaderboard via referral-leaderboard.util,
 * resolveTier via reward-tier.util) and the E8 one-time-token pattern (referral-code.util).
 * Money is never touched: attribution is money-free, funds always flow to the school.
 * Prisma I/O lives here; all logic lives in the gated pure utils.
 */
@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private readonly prisma: PrismaService) {}

  private shareUrl(code: string): string {
    return `${SHARE_BASE_URL.replace(/\/$/, '')}/r/${code}`;
  }

  // ---- Donor referral face ----------------------------------------------

  async donorReferral(donorUserId: string): Promise<DonorReferralView> {
    const link = await this.getOrCreateReferralLink(donorUserId);
    const stats = await this.referralLinkStats(link.id);
    const reward = referralReward(stats.donated);
    const templates = buildShareTemplates({
      url: this.shareUrl(link.code),
      name: await this.donorName(donorUserId),
      face: 'referral',
    });

    return {
      link: { code: link.code, shareUrl: this.shareUrl(link.code) },
      stats: computeReferralStats(stats),
      reward,
      optInLeaderboard: link.optInLeaderboard,
      templates,
    };
  }

  async setLeaderboardOptIn(
    donorUserId: string,
    optIn: boolean,
  ): Promise<{ optInLeaderboard: boolean }> {
    const link = await this.getOrCreateReferralLink(donorUserId);
    const updated = await this.prisma.referralLink.update({
      where: { id: link.id },
      data: { optInLeaderboard: optIn },
    });
    return { optInLeaderboard: updated.optInLeaderboard };
  }

  async referralLeaderboard(): Promise<LeaderboardView> {
    const links = await this.prisma.referralLink.findMany({
      where: { optInLeaderboard: true },
      include: { _count: { select: { attributions: true } } },
    });
    const rows = links.map((link) => ({
      id: link.donorUserId,
      label: link.donorUserId,
      count: link._count.attributions,
    }));
    return { entries: buildReferralLeaderboard(rows) };
  }

  // ---- Advocate face ----------------------------------------------------

  async inviteAdvocate(
    studentUserId: string,
    campaignId: string,
    dto: InviteAdvocateDto,
  ): Promise<CreatedAdvocateView> {
    await this.assertOwnCampaign(studentUserId, campaignId);

    const activeCount = await this.prisma.advocateInvite.count({
      where: { campaignId, status: 'ACTIVE' },
    });
    if (activeCount >= MAX_ADVOCATES_PER_CAMPAIGN) {
      throw new DomainException(
        'ADVOCATE_LIMIT',
        'Advocate limit reached',
        400,
      );
    }

    const { code, codeHash } = createReferralCode();
    const invite = await this.prisma.advocateInvite.create({
      data: {
        campaignId,
        name: dto.name,
        email: dto.email ?? null,
        codeHash,
      },
    });

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { title: true },
    });

    return {
      id: invite.id,
      name: invite.name,
      shareUrl: this.shareUrl(code),
      templates: buildShareTemplates({
        url: this.shareUrl(code),
        name: dto.name,
        face: 'advocate',
        campaignTitle: campaign?.title,
      }),
    };
  }

  async advocates(
    studentUserId: string,
    campaignId: string,
  ): Promise<AdvocateDashboardView> {
    await this.assertOwnCampaign(studentUserId, campaignId);

    const invites = await this.prisma.advocateInvite.findMany({
      where: { campaignId, status: 'ACTIVE' },
      include: { _count: { select: { attributions: true } } },
    });

    const advocates: AdvocateRowView[] = invites.map((invite) => ({
      id: invite.id,
      name: invite.name,
      email: invite.email,
      referralCount: invite._count.attributions,
      reward: referralReward(invite._count.attributions),
      rank: 0,
    }));

    const leaderboard = buildAdvocateLeaderboard(
      invites.map((invite) => ({
        id: invite.id,
        label: invite.name,
        count: invite._count.attributions,
      })),
    );
    const rankById = new Map(leaderboard.map((e) => [e.id, e.rank]));
    const ranked = advocates
      .map((a) => ({ ...a, rank: rankById.get(a.id) ?? 0 }))
      .sort((a, b) => a.rank - b.rank);

    return {
      campaignId,
      advocateCount: invites.length,
      remaining: Math.max(0, MAX_ADVOCATES_PER_CAMPAIGN - invites.length),
      advocates: ranked,
      leaderboard,
    };
  }

  async advocateLeaderboard(campaignId: string): Promise<LeaderboardView> {
    const invites = await this.prisma.advocateInvite.findMany({
      where: { campaignId, status: 'ACTIVE' },
      include: { _count: { select: { attributions: true } } },
    });
    return {
      entries: buildAdvocateLeaderboard(
        invites.map((invite) => ({
          id: invite.id,
          label: invite.name,
          count: invite._count.attributions,
        })),
      ),
    };
  }

  // ---- Attribution (called from the donations path, money-free) ----------

  /**
   * Attributes a successful donation to a referral/advocate code. Never throws into
   * the money path: a failure is logged and swallowed. Looks up the code across both
   * referral links and advocate invites (hash-only), runs the pure decision, and
   * persists a deduped ReferralAttribution (donationId is unique).
   */
  async attributeDonation(donationId: string, rawCode: string): Promise<void> {
    try {
      if (!rawCode) return;
      const codeHash = hashReferralCode(rawCode);

      const [donation, referralLink, advocateInvite, existing] =
        await Promise.all([
          this.prisma.donation.findUnique({ where: { id: donationId } }),
          this.prisma.referralLink.findUnique({ where: { codeHash } }),
          this.prisma.advocateInvite.findUnique({ where: { codeHash } }),
          this.prisma.referralAttribution.findUnique({ where: { donationId } }),
        ]);
      if (!donation) return;

      const kind = referralLink ? 'REFERRAL' : 'ADVOCATE';
      const record = referralLink
        ? { codeHash: referralLink.codeHash }
        : advocateInvite
          ? { codeHash: advocateInvite.codeHash, status: advocateInvite.status }
          : null;
      const referrerUserId = referralLink ? referralLink.donorUserId : null;

      const decision = resolveAttribution({
        code: rawCode,
        record,
        kind,
        donationStatus: donation.status,
        donorUserId: donation.donorUserId,
        referrerUserId,
        alreadyAttributed: existing !== null,
      });
      if (!decision.attribute) return;

      await this.prisma.referralAttribution.create({
        data: {
          kind,
          donationId,
          referralLinkId: referralLink?.id ?? null,
          advocateInviteId: referralLink ? null : (advocateInvite?.id ?? null),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Referral attribution skipped for donation ${donationId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  // ---- Helpers ----------------------------------------------------------

  private async getOrCreateReferralLink(donorUserId: string) {
    const existing = await this.prisma.referralLink.findUnique({
      where: { donorUserId },
    });
    if (existing) return existing;

    const { code, codeHash } = createReferralCode();
    return this.prisma.referralLink.create({
      data: { donorUserId, code, codeHash },
    });
  }

  /** invited = attributed donations, donated = counted donations, active = recurring. */
  private async referralLinkStats(referralLinkId: string) {
    const attributions = await this.prisma.referralAttribution.findMany({
      where: { referralLinkId },
      include: {
        donation: {
          select: { status: true, donorUserId: true, recurringPledgeId: true },
        },
      },
    });
    const invited = attributions.length;
    const counted = attributions.filter((a) =>
      COUNTED.includes(a.donation.status),
    );
    const donated = counted.length;
    const active = counted.filter(
      (a) => a.donation.recurringPledgeId !== null,
    ).length;
    return { invited, donated, active };
  }

  private async donorName(donorUserId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: donorUserId },
      select: { displayName: true },
    });
    return user?.displayName ?? 'A supporter';
  }

  private async assertOwnCampaign(
    studentUserId: string,
    campaignId: string,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { studentProfile: { select: { userId: true } } },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }
    if (campaign.studentProfile.userId !== studentUserId) {
      throw new DomainException('FORBIDDEN', 'Not your campaign', 403);
    }
  }

  /** Exposed for tests / typing clarity. */
  static maxAdvocates(): number {
    return MAX_ADVOCATES_PER_CAMPAIGN;
  }
}

export type { AdvocateInvite };
