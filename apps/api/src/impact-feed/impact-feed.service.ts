import { Inject, Injectable } from '@nestjs/common';
import { DonationStatus, FeedChannel } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { crossedMilestones } from '../donations/milestone.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChannelPref,
  messengerChannels,
  routeChannels,
} from './channel-router';
import { ChannelPrefDto, FEED_CHANNELS } from './dto/channel-pref.dto';
import { StudentVoiceDto } from './dto/student-voice.dto';
import {
  FeedSource,
  MilestoneSource,
  UpdateSource,
  VoiceSource,
  buildFeed,
} from './feed-builder';
import { detectInactivity } from './inactivity';
import {
  MESSAGING_PROVIDER,
  MessagingChannel,
} from './messaging/messaging-provider.interface';
import type { MessagingProvider } from './messaging/messaging-provider.interface';
import { computeReadStreak } from './read-streak';
import { moderateVoice } from './voice-moderation';

const COUNTED_STATUSES: DonationStatus[] = [
  DonationStatus.PLEDGED,
  DonationStatus.CAPTURED,
  DonationStatus.SUCCEEDED,
];
/** Days without a counted donation after which we surface the gentle reminder. */
const INACTIVITY_THRESHOLD_DAYS = 90;
/** Channels the MessagingProvider can deliver to (external, non in-app/email). */
const PROVIDER_CHANNELS: FeedChannel[] = [
  FeedChannel.WHATSAPP,
  FeedChannel.TELEGRAM,
  FeedChannel.MESSENGER,
  FeedChannel.PUSH,
];

/**
 * E17 Impact-Feed service — Prisma I/O + the messaging provider behind the pure
 * primitives. This LAYERS ON TOP of E4: it reads E4's CampaignUpdate /
 * UpdateSubscription / Donation as the feed source and never touches the E4
 * email thank-you path. Nothing here writes to a Donation/Payout — money still
 * goes to the school. It is not a pure core (I/O), so it is not under the 80%
 * gate; its behaviour is covered by a mocked-Prisma + mock-provider spec.
 */
@Injectable()
export class ImpactFeedService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_PROVIDER)
    private readonly messaging: MessagingProvider,
  ) {}

  /** Campaign ids a donor supports (counted donation) or subscribed to. */
  private async supportedCampaignIds(userId: string): Promise<string[]> {
    const [donations, subs] = await Promise.all([
      this.prisma.donation.findMany({
        where: {
          donorUserId: userId,
          status: { in: COUNTED_STATUSES },
        },
        select: { campaignId: true },
      }),
      this.prisma.updateSubscription.findMany({
        where: { donorUserId: userId },
        select: { campaignId: true },
      }),
    ]);
    return [
      ...new Set([
        ...donations.map((d) => d.campaignId),
        ...subs.map((s) => s.campaignId),
      ]),
    ];
  }

  private async feedSources(campaignIds: string[]): Promise<FeedSource[]> {
    if (campaignIds.length === 0) return [];

    const [campaigns, updates, voices] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: {
          id: true,
          raisedCents: true,
          goalCents: true,
          studentProfile: { select: { fullName: true, photoUrl: true } },
        },
      }),
      this.prisma.campaignUpdate.findMany({
        where: { campaignId: { in: campaignIds } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.studentMessage.findMany({
        where: { campaignId: { in: campaignIds }, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const byId = new Map(campaigns.map((c) => [c.id, c]));

    const updateSources: UpdateSource[] = updates.map((u) => ({
      type: 'update',
      id: u.id,
      campaignId: u.campaignId,
      title: u.title,
      body: u.body,
      photoUrl: byId.get(u.campaignId)?.studentProfile.photoUrl ?? null,
      createdAt: u.createdAt,
    }));

    const voiceSources: VoiceSource[] = voices.map((v) => ({
      type: 'voice',
      id: v.id,
      campaignId: v.campaignId,
      studentName:
        byId.get(v.campaignId)?.studentProfile.fullName ?? 'A student',
      text: v.text,
      videoUrl: v.videoUrl,
      voiceUrl: v.voiceUrl,
      photoUrl: byId.get(v.campaignId)?.studentProfile.photoUrl ?? null,
      createdAt: v.createdAt,
    }));

    // Derived "current funding" milestone per campaign (from 0 → raised).
    const milestoneSources: MilestoneSource[] = [];
    for (const c of campaigns) {
      const reached = crossedMilestones(0, c.raisedCents, c.goalCents);
      const top = reached[reached.length - 1];
      if (top === undefined) continue;
      milestoneSources.push({
        type: 'milestone',
        campaignId: c.id,
        percent: top,
        studentName: c.studentProfile.fullName,
        photoUrl: c.studentProfile.photoUrl,
        createdAt: new Date(0), // anchor old so live updates/voices rank above it
      });
    }

    return [...updateSources, ...voiceSources, ...milestoneSources];
  }

  async feed(userId: string, now: Date = new Date()) {
    const campaignIds = await this.supportedCampaignIds(userId);
    const sources = await this.feedSources(campaignIds);
    const items = buildFeed(sources);

    const reads = await this.prisma.feedRead.findMany({
      where: { userId },
      select: { feedItemKey: true, readAt: true },
    });
    const readKeys = new Set(reads.map((r) => r.feedItemKey));

    const decorated = items.map((i) => ({ ...i, read: readKeys.has(i.key) }));
    const readStreak = computeReadStreak(
      reads.map((r) => r.readAt),
      now,
    );

    return {
      items: decorated,
      unreadCount: decorated.filter((i) => !i.read).length,
      readStreak,
    };
  }

  async markRead(userId: string, feedItemKey: string) {
    await this.prisma.feedRead.upsert({
      where: { userId_feedItemKey: { userId, feedItemKey } },
      update: {},
      create: { userId, feedItemKey },
    });
    return { read: true };
  }

  async channelPrefs(userId: string) {
    const rows = await this.prisma.notificationChannelPref.findMany({
      where: { userId },
    });
    const byChannel = new Map(rows.map((r) => [r.channel, r]));
    const prefs = FEED_CHANNELS.map((channel) => ({
      channel,
      optIn:
        channel === 'IN_APP' ? true : (byChannel.get(channel)?.optIn ?? false),
      handle: byChannel.get(channel)?.handle ?? undefined,
    }));
    return { prefs };
  }

  async setChannelPref(userId: string, dto: ChannelPrefDto) {
    if (dto.channel === 'IN_APP') {
      throw new DomainException('INVALID_CHANNEL', 'IN_APP is always on', 400);
    }
    await this.prisma.notificationChannelPref.upsert({
      where: { userId_channel: { userId, channel: dto.channel } },
      update: { optIn: dto.optIn, handle: dto.handle ?? null },
      create: {
        userId,
        channel: dto.channel,
        optIn: dto.optIn,
        handle: dto.handle ?? null,
      },
    });
    return { channel: dto.channel, optIn: dto.optIn };
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

  /** Donor ids subscribed to / supporting a campaign (the voice audience). */
  private async campaignDonorIds(campaignId: string): Promise<string[]> {
    const [subs, donations] = await Promise.all([
      this.prisma.updateSubscription.findMany({
        where: { campaignId },
        select: { donorUserId: true },
      }),
      this.prisma.donation.findMany({
        where: {
          campaignId,
          donorUserId: { not: null },
          status: { in: COUNTED_STATUSES },
        },
        select: { donorUserId: true },
      }),
    ]);
    return [
      ...new Set([
        ...subs.map((s) => s.donorUserId),
        ...donations.map((d) => d.donorUserId as string),
      ]),
    ];
  }

  /** Fan out an approved voice to opted-in donors via the messaging provider. */
  private async fanOutVoice(campaignId: string, body: string): Promise<number> {
    const donorIds = await this.campaignDonorIds(campaignId);
    if (donorIds.length === 0) return 0;

    const prefs = await this.prisma.notificationChannelPref.findMany({
      where: {
        userId: { in: donorIds },
        optIn: true,
        channel: { in: PROVIDER_CHANNELS },
      },
    });

    let delivered = 0;
    for (const donorId of donorIds) {
      const donorPrefs: ChannelPref[] = prefs
        .filter((p) => p.userId === donorId)
        .map((p) => ({
          channel: p.channel as ChannelPref['channel'],
          optIn: p.optIn,
          handle: p.handle,
        }));
      // routeChannels keeps IN_APP first; we only send the external ones here.
      void routeChannels(donorPrefs);
      for (const target of messengerChannels(donorPrefs)) {
        const result = await this.messaging.send({
          channel: target.channel as MessagingChannel,
          to: target.handle,
          subject: 'A new thank-you from your student',
          body,
        });
        if (result.ok) delivered += 1;
      }
    }
    return delivered;
  }

  async submitVoice(
    studentUserId: string,
    campaignId: string,
    dto: StudentVoiceDto,
  ) {
    await this.assertOwnCampaign(studentUserId, campaignId);

    const moderation = moderateVoice({
      text: dto.text,
      videoUrl: dto.videoUrl ?? null,
      voiceUrl: dto.voiceUrl ?? null,
    });

    const message = await this.prisma.studentMessage.create({
      data: {
        campaignId,
        text: dto.text,
        videoUrl: dto.videoUrl ?? null,
        voiceUrl: dto.voiceUrl ?? null,
        status: moderation.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        moderationReason:
          moderation.reasons.length > 0 ? moderation.reasons.join(',') : null,
      },
    });

    let delivered = 0;
    if (moderation.decision === 'APPROVE') {
      delivered = await this.fanOutVoice(campaignId, dto.text);
    }

    return {
      id: message.id,
      status: message.status,
      reasons: moderation.reasons,
      delivered,
    };
  }

  async inactivity(userId: string, now: Date = new Date()) {
    const last = await this.prisma.donation.findFirst({
      where: {
        donorUserId: userId,
        status: { in: COUNTED_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        campaignId: true,
        campaign: {
          select: { studentProfile: { select: { fullName: true } } },
        },
      },
    });

    const result = detectInactivity({
      lastDonationAt: last?.createdAt ?? null,
      now,
      thresholdDays: INACTIVITY_THRESHOLD_DAYS,
    });

    if (!result.shouldRemind || !last) {
      return { ...result, reminder: undefined };
    }

    const studentName = last.campaign.studentProfile.fullName;
    return {
      ...result,
      reminder: {
        title: "It's been a while — your students miss you",
        body: `${studentName} has new milestones. Pick up your giving streak with one tap.`,
        ctaUrl: `/campaigns/${last.campaignId}?ref=reminder`,
      },
    };
  }
}
