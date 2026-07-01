import { Injectable, Logger } from '@nestjs/common';
import { GroupMode, GroupRole, Prisma } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { CorporateService } from '../corporate/corporate.service';
import { PrismaService } from '../prisma/prisma.service';
import { splitCohortMatch } from './cohort-match';
import { moderateMessage } from './chat-moderation';
import {
  AddCampaignDto,
  CastBallotDto,
  CohortMatchDto,
  ContributeDto,
  CreateGroupDto,
  CreateInviteDto,
  JoinGroupDto,
  OpenVoteDto,
  PostMessageDto,
  SetRoleDto,
} from './dto/group.dto';
import { buildGroupAnalytics } from './group-analytics';
import { createGroupInvite, decideInviteAcceptance } from './group-invite';
import { buildGroupLeaderboard } from './group-leaderboard';
import { decideLeave, decideRoleChange } from './membership';
import { computeSharedGoal } from './shared-goal';
import { decideStretchGoal } from './stretch-goal';
import { tallyVote } from './voting';

const SHARE_BASE_URL = process.env.WEB_BASE_URL ?? 'https://bursa.app';

/**
 * E18 Groups-Engine — one engine, two modes (COHORT | GIVING_CIRCLE). Prisma I/O
 * behind the gated pure primitives, plus collaborators reused from earlier epics:
 *  - E16 gamification (rankLeaderboard / aggregateContributions) for leaderboards
 *    and analytics/portfolio;
 *  - E15/E8 one-time-token pattern for group invites (hash-only);
 *  - E9 keyword/slur filter for the moderated group chat;
 *  - E5 CorporateService.sponsor for the cohort match (NO new payment path).
 * Money-free: E18 never writes to a Donation/Payout — funds still flow to the
 * school. This service is not a pure core, so it is not under the 80% gate; its
 * behaviour is covered by the gated primitives + a mocked-Prisma service spec.
 */
@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly corporate: CorporateService,
  ) {}

  // ---- CRUD + listing ----------------------------------------------------

  async create(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.group.create({
      data: {
        mode: dto.mode,
        visibility: dto.visibility ?? 'PRIVATE',
        name: dto.name,
        description: dto.description ?? null,
        logoUrl: dto.logoUrl ?? null,
        sharedGoalCents: dto.sharedGoalCents ?? 0,
        stretchThresholdPct: dto.stretchThresholdPct ?? 80,
        members: { create: { userId, role: 'ADMIN' } },
      },
    });
    return { id: group.id, mode: group.mode, role: 'ADMIN' as GroupRole };
  }

  async list(userId: string) {
    const [mine, publics] = await Promise.all([
      this.prisma.group.findMany({
        where: { members: { some: { userId } } },
        include: {
          _count: { select: { members: true } },
          members: { where: { userId }, select: { role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.group.findMany({
        where: { visibility: 'PUBLIC' },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    const mineIds = new Set(mine.map((g) => g.id));
    return {
      mine: mine.map((g) => ({
        id: g.id,
        mode: g.mode,
        name: g.name,
        visibility: g.visibility,
        role: g.members[0]?.role ?? 'VIEWER',
        memberCount: g._count.members,
      })),
      public: publics
        .filter((g) => !mineIds.has(g.id))
        .map((g) => ({
          id: g.id,
          mode: g.mode,
          name: g.name,
          visibility: g.visibility,
          memberCount: g._count.members,
        })),
    };
  }

  async get(userId: string, groupId: string, now: Date = new Date()) {
    const group = await this.loadGroup(groupId);
    const membership = await this.membership(userId, groupId);
    if (!membership && group.visibility !== 'PUBLIC') {
      throw new DomainException('FORBIDDEN', 'Not a member of this group', 403);
    }

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { displayName: true } } },
    });

    const parts =
      group.mode === GroupMode.COHORT
        ? await this.cohortParts(groupId)
        : await this.circleParts(groupId);

    const sharedGoal = computeSharedGoal({
      parts: parts.map((p) => ({ valueCents: p.valueCents })),
      goalCents: group.sharedGoalCents,
    });
    const stretch = decideStretchGoal({
      raisedCents: sharedGoal.raisedCents,
      goalCents: group.sharedGoalCents,
      thresholdPct: group.stretchThresholdPct,
    });
    const leaderboard = buildGroupLeaderboard(
      await this.memberContributions(groupId, members),
    );

    return {
      group: {
        id: group.id,
        mode: group.mode,
        visibility: group.visibility,
        name: group.name,
        description: group.description,
        logoUrl: group.logoUrl,
        sharedGoalCents: group.sharedGoalCents,
        stretchThresholdPct: group.stretchThresholdPct,
      },
      role: membership?.role ?? null,
      memberCount: members.length,
      sharedGoal,
      stretch,
      leaderboard,
      members: members.map((m) => ({
        userId: m.userId,
        name: m.user.displayName,
        role: m.role,
      })),
      ...(group.mode === GroupMode.COHORT
        ? { subCampaigns: parts }
        : { contributions: parts }),
      analytics: buildGroupAnalytics({
        contributions: (await this.circleContributions(groupId)).map((c) => ({
          targetId: c.campaignId,
          valueCents: c.valueCents,
          at: c.createdAt,
        })),
        memberCount: members.length,
        goalCents: group.sharedGoalCents,
        now,
      }),
    };
  }

  // ---- Membership + invites ---------------------------------------------

  async invite(userId: string, groupId: string, dto: CreateInviteDto) {
    await this.assertRole(userId, groupId, 'ADMIN');
    const role = dto.role ?? 'CONTRIBUTOR';
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    const invite = createGroupInvite(role, { expiresAt });
    await this.prisma.groupInvite.create({
      data: {
        groupId,
        codeHash: invite.codeHash,
        role,
        expiresAt,
      },
    });
    return {
      link: `${SHARE_BASE_URL.replace(/\/$/, '')}/groups/${groupId}/join?token=${invite.code}`,
      role,
      expiresAt,
    };
  }

  async join(
    userId: string,
    groupId: string,
    dto: JoinGroupDto,
    now: Date = new Date(),
  ) {
    await this.loadGroup(groupId);
    const invites = await this.prisma.groupInvite.findMany({
      where: { groupId, status: 'ACTIVE' },
    });
    const already = (await this.membership(userId, groupId)) !== null;

    for (const record of invites) {
      const decision = decideInviteAcceptance({
        record: {
          codeHash: record.codeHash,
          status: record.status,
          role: record.role,
          expiresAt: record.expiresAt,
        },
        rawCode: dto.token,
        now,
        alreadyMember: already,
      });
      if (decision.accept) {
        const member = await this.prisma.groupMember.create({
          data: { groupId, userId, role: decision.role ?? 'CONTRIBUTOR' },
        });
        return { groupId, role: member.role };
      }
      if (decision.reason === 'already_member') {
        throw new DomainException('ALREADY_MEMBER', 'Already a member', 409);
      }
    }
    throw new DomainException(
      'INVALID_INVITE',
      'Invalid or expired invite',
      400,
    );
  }

  async leave(userId: string, groupId: string) {
    const members = await this.memberStates(groupId);
    const decision = decideLeave(members, userId);
    if (!decision.allow) {
      throw new DomainException(
        decision.reason ?? 'FORBIDDEN',
        'Cannot leave the group',
        decision.reason === 'LAST_ADMIN' ? 409 : 400,
      );
    }
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId } });
    return { left: true };
  }

  async setRole(
    actorId: string,
    groupId: string,
    targetUserId: string,
    dto: SetRoleDto,
  ) {
    const actor = await this.assertMember(actorId, groupId);
    const members = await this.memberStates(groupId);
    const decision = decideRoleChange(
      members,
      actor.role,
      targetUserId,
      dto.role,
    );
    if (!decision.allow) {
      throw new DomainException(
        decision.reason ?? 'FORBIDDEN',
        'Cannot change role',
        decision.reason === 'LAST_ADMIN' ? 409 : 403,
      );
    }
    await this.prisma.groupMember.updateMany({
      where: { groupId, userId: targetUserId },
      data: { role: decision.nextRole },
    });
    return { userId: targetUserId, role: decision.nextRole };
  }

  // ---- Cohort: sub-campaigns + match ------------------------------------

  async addCampaign(userId: string, groupId: string, dto: AddCampaignDto) {
    const group = await this.loadGroup(groupId);
    if (group.mode !== GroupMode.COHORT) {
      throw new DomainException(
        'NOT_A_COHORT',
        'Only cohorts have sub-campaigns',
        400,
      );
    }
    await this.assertRole(userId, groupId, 'CONTRIBUTOR');
    await this.assertOwnCampaign(userId, dto.campaignId);
    const exists = await this.prisma.groupCampaign.findUnique({
      where: { groupId_campaignId: { groupId, campaignId: dto.campaignId } },
    });
    if (exists) {
      throw new DomainException(
        'ALREADY_LINKED',
        'Campaign already linked',
        409,
      );
    }
    await this.prisma.groupCampaign.create({
      data: { groupId, campaignId: dto.campaignId, addedByUserId: userId },
    });
    return { groupId, campaignId: dto.campaignId };
  }

  /**
   * A corporate sponsor matches the whole cohort. `splitCohortMatch` allocates the
   * total across the sub-campaigns; the actual money movement runs through the
   * EXISTING E5 CorporateService.sponsor flow (no new payment path). E18 never
   * writes to a Donation/Payout — funds still flow to the school.
   */
  async matchCohort(userId: string, groupId: string, dto: CohortMatchDto) {
    const group = await this.loadGroup(groupId);
    if (group.mode !== GroupMode.COHORT) {
      throw new DomainException(
        'NOT_A_COHORT',
        'Only cohorts can be matched',
        400,
      );
    }
    await this.assertRole(userId, groupId, 'ADMIN');

    const links = await this.prisma.groupCampaign.findMany({
      where: { groupId },
      include: {
        campaign: {
          select: {
            id: true,
            goalCents: true,
            raisedCents: true,
            status: true,
          },
        },
      },
    });
    const donatable = links.filter((l) => l.campaign.status === 'LIVE');
    if (donatable.length === 0) {
      throw new DomainException(
        'NO_SUBCAMPAIGNS',
        'No live sub-campaigns to match',
        400,
      );
    }

    const { allocations } = splitCohortMatch({
      subCampaigns: donatable.map((l) => ({
        campaignId: l.campaignId,
        gapCents: Math.max(0, l.campaign.goalCents - l.campaign.raisedCents),
      })),
      totalCents: dto.totalCents,
      mode: 'GAP',
    });

    const sponsored: { campaignId: string; amountCents: number }[] = [];
    for (const allocation of allocations) {
      if (allocation.amountCents <= 0) continue;
      await this.corporate.sponsor(allocation.campaignId, userId, {
        tier: 'CUSTOM',
        amountCents: allocation.amountCents,
        method: dto.method,
        scholarshipName: dto.scholarshipName,
      });
      sponsored.push(allocation);
    }
    return {
      totalCents: sponsored.reduce((sum, s) => sum + s.amountCents, 0),
      sponsored,
    };
  }

  // ---- Circle: contributions --------------------------------------------

  async contribute(userId: string, groupId: string, dto: ContributeDto) {
    const group = await this.loadGroup(groupId);
    if (group.mode !== GroupMode.GIVING_CIRCLE) {
      throw new DomainException(
        'NOT_A_CIRCLE',
        'Only circles collect contributions',
        400,
      );
    }
    await this.assertRole(userId, groupId, 'CONTRIBUTOR');

    const donation = await this.prisma.donation.findUnique({
      where: { id: dto.donationId },
      select: { id: true, donorUserId: true, amountCents: true },
    });
    if (!donation) {
      throw new DomainException('NOT_FOUND', 'Donation not found', 404);
    }
    if (donation.donorUserId !== userId) {
      throw new DomainException('FORBIDDEN', 'Not your donation', 403);
    }
    const exists = await this.prisma.groupContribution.findUnique({
      where: { donationId: donation.id },
    });
    if (exists) {
      throw new DomainException(
        'ALREADY_LINKED',
        'Donation already contributed',
        409,
      );
    }
    await this.prisma.groupContribution.create({
      data: {
        groupId,
        userId,
        donationId: donation.id,
        valueCents: donation.amountCents,
      },
    });
    return {
      groupId,
      donationId: donation.id,
      valueCents: donation.amountCents,
    };
  }

  async analytics(userId: string, groupId: string, now: Date = new Date()) {
    const group = await this.loadGroup(groupId);
    await this.assertMemberOrPublic(userId, group);
    const [contributions, memberCount] = await Promise.all([
      this.circleContributions(groupId),
      this.prisma.groupMember.count({ where: { groupId } }),
    ]);
    return buildGroupAnalytics({
      contributions: contributions.map((c) => ({
        targetId: c.campaignId,
        valueCents: c.valueCents,
        at: c.createdAt,
      })),
      memberCount,
      goalCents: group.sharedGoalCents,
      now,
    });
  }

  // ---- Voting ------------------------------------------------------------

  async openVote(userId: string, groupId: string, dto: OpenVoteDto) {
    await this.assertRole(userId, groupId, 'ADMIN');
    const vote = await this.prisma.groupVote.create({
      data: {
        groupId,
        question: dto.question,
        options: {
          create: dto.options.map((o) => ({
            campaignId: o.campaignId,
            label: o.label,
          })),
        },
      },
    });
    return { id: vote.id, status: vote.status };
  }

  async castBallot(
    userId: string,
    groupId: string,
    voteId: string,
    dto: CastBallotDto,
  ) {
    await this.assertRole(userId, groupId, 'CONTRIBUTOR');
    const vote = await this.prisma.groupVote.findFirst({
      where: { id: voteId, groupId },
      include: { options: { select: { id: true } } },
    });
    if (!vote) {
      throw new DomainException('NOT_FOUND', 'Vote not found', 404);
    }
    if (vote.status === 'CLOSED') {
      throw new DomainException('VOTE_CLOSED', 'This vote is closed', 409);
    }
    if (!vote.options.some((o) => o.id === dto.optionId)) {
      throw new DomainException('INVALID_OPTION', 'Unknown option', 400);
    }
    const existing = await this.prisma.groupVoteBallot.findUnique({
      where: { voteId_userId: { voteId, userId } },
    });
    if (existing) {
      throw new DomainException('ALREADY_VOTED', 'You already voted', 409);
    }
    await this.prisma.groupVoteBallot.create({
      data: { voteId, optionId: dto.optionId, userId },
    });
    return { voteId, optionId: dto.optionId };
  }

  async voteState(userId: string, groupId: string, voteId: string) {
    const group = await this.loadGroup(groupId);
    await this.assertMemberOrPublic(userId, group);
    const vote = await this.prisma.groupVote.findFirst({
      where: { id: voteId, groupId },
      include: { options: true, ballots: { select: { optionId: true } } },
    });
    if (!vote) {
      throw new DomainException('NOT_FOUND', 'Vote not found', 404);
    }
    const tally = tallyVote({
      options: vote.options.map((o) => ({ id: o.id })),
      ballots: vote.ballots,
    });
    const countById = new Map(tally.counts.map((c) => [c.optionId, c.count]));
    return {
      id: vote.id,
      question: vote.question,
      status: vote.status,
      options: vote.options.map((o) => ({
        id: o.id,
        label: o.label,
        campaignId: o.campaignId,
        count: countById.get(o.id) ?? 0,
      })),
      totalVotes: tally.totalVotes,
      winnerId: tally.winnerId,
      decided: tally.decided,
    };
  }

  async closeVote(userId: string, groupId: string, voteId: string) {
    await this.assertRole(userId, groupId, 'ADMIN');
    const vote = await this.prisma.groupVote.findFirst({
      where: { id: voteId, groupId },
      include: { options: true, ballots: { select: { optionId: true } } },
    });
    if (!vote) {
      throw new DomainException('NOT_FOUND', 'Vote not found', 404);
    }
    await this.prisma.groupVote.update({
      where: { id: voteId },
      data: { status: 'CLOSED' },
    });
    const tally = tallyVote({
      options: vote.options.map((o) => ({ id: o.id })),
      ballots: vote.ballots,
    });
    return { id: vote.id, status: 'CLOSED', winnerId: tally.winnerId };
  }

  // ---- Moderated chat ----------------------------------------------------

  async postMessage(userId: string, groupId: string, dto: PostMessageDto) {
    await this.assertRole(userId, groupId, 'CONTRIBUTOR');
    const moderation = moderateMessage({ text: dto.text });
    const message = await this.prisma.groupMessage.create({
      data: {
        groupId,
        userId,
        text: dto.text,
        status: moderation.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        moderationReason:
          moderation.reasons.length > 0 ? moderation.reasons.join(',') : null,
      },
    });
    return {
      id: message.id,
      status: message.status,
      reasons: moderation.reasons,
    };
  }

  async messages(userId: string, groupId: string) {
    const group = await this.loadGroup(groupId);
    await this.assertMemberOrPublic(userId, group);
    const rows = await this.prisma.groupMessage.findMany({
      where: { groupId, status: 'APPROVED' },
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return {
      messages: rows.map((m) => ({
        userId: m.userId,
        name: m.user.displayName,
        text: m.text,
        createdAt: m.createdAt,
      })),
    };
  }

  // ---- Helpers -----------------------------------------------------------

  private async loadGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new DomainException('NOT_FOUND', 'Group not found', 404);
    }
    return group;
  }

  private async membership(userId: string, groupId: string) {
    return this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  private async assertMember(userId: string, groupId: string) {
    const member = await this.membership(userId, groupId);
    if (!member) {
      throw new DomainException('FORBIDDEN', 'Not a member of this group', 403);
    }
    return member;
  }

  private async assertMemberOrPublic(
    userId: string,
    group: { id: string; visibility: string },
  ): Promise<void> {
    const member = await this.membership(userId, group.id);
    if (!member && group.visibility !== 'PUBLIC') {
      throw new DomainException('FORBIDDEN', 'Not a member of this group', 403);
    }
  }

  private async assertRole(userId: string, groupId: string, min: GroupRole) {
    const member = await this.assertMember(userId, groupId);
    const rank: Record<GroupRole, number> = {
      VIEWER: 0,
      CONTRIBUTOR: 1,
      ADMIN: 2,
    };
    if (rank[member.role] < rank[min]) {
      throw new DomainException('FORBIDDEN', `Requires ${min} role`, 403);
    }
    return member;
  }

  private async memberStates(groupId: string) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true, role: true },
    });
    return members.map((m) => ({ userId: m.userId, role: m.role }));
  }

  private async assertOwnCampaign(
    userId: string,
    campaignId: string,
  ): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { studentProfile: { select: { userId: true } } },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }
    if (campaign.studentProfile.userId !== userId) {
      throw new DomainException('FORBIDDEN', 'Not your campaign', 403);
    }
  }

  /** Cohort parts = sub-campaigns' raised amounts (feed the shared goal). */
  private async cohortParts(groupId: string) {
    const links = await this.prisma.groupCampaign.findMany({
      where: { groupId },
      include: {
        campaign: {
          select: { id: true, title: true, raisedCents: true, goalCents: true },
        },
      },
    });
    return links.map((l) => ({
      campaignId: l.campaignId,
      title: l.campaign.title,
      valueCents: l.campaign.raisedCents,
      goalCents: l.campaign.goalCents,
    }));
  }

  /** Circle parts = members' contributions (feed the shared goal). */
  private async circleParts(groupId: string) {
    const contributions = await this.circleContributions(groupId);
    return contributions.map((c) => ({
      campaignId: c.campaignId,
      title: c.campaignTitle,
      valueCents: c.valueCents,
    }));
  }

  private async circleContributions(groupId: string) {
    const rows = await this.prisma.groupContribution.findMany({
      where: { groupId },
      include: {
        donation: {
          select: { campaignId: true, campaign: { select: { title: true } } },
        },
      },
    });
    return rows.map((r) => ({
      campaignId: r.donation.campaignId,
      campaignTitle: r.donation.campaign.title,
      valueCents: r.valueCents,
      userId: r.userId,
      createdAt: r.createdAt,
    }));
  }

  /** Per-member contribution totals for the leaderboard (E16 rankLeaderboard). */
  private async memberContributions(
    groupId: string,
    members: { userId: string; user: { displayName: string } }[],
  ) {
    const contributions = await this.prisma.groupContribution.groupBy({
      by: ['userId'],
      where: { groupId },
      _sum: { valueCents: true },
    });
    const byUser = new Map(
      contributions.map((c) => [c.userId, c._sum.valueCents ?? 0]),
    );
    return members.map((m) => ({
      userId: m.userId,
      label: m.user.displayName,
      valueCents: byUser.get(m.userId) ?? 0,
    }));
  }
}

// Keep Prisma value referenced (parity with sibling services; typing clarity).
export type { Prisma };
