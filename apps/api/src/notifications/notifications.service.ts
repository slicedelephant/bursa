import { Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { crossedMilestones } from '../donations/milestone.util';
import { PrismaService } from '../prisma/prisma.service';
import { EmailLogger } from './email-logger';
import {
  NotificationContent,
  impactUpdateNotification,
  milestoneNotification,
  thankYouNotification,
} from './notification-templates';

export interface DonationEvent {
  donorUserId?: string | null;
  campaignId: string;
  studentName: string;
  amountCents: number;
  prevRaised: number;
  newRaised: number;
  goalCents: number;
}

export interface ImpactUpdateEvent {
  campaignId: string;
  studentName: string;
  updateTitle: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailLogger,
  ) {}

  /** Create an in-app notification, optionally also logging an email copy. */
  async deliver(
    userId: string,
    content: NotificationContent,
    campaignId?: string | null,
    opts: { email?: boolean } = {},
  ) {
    const row = await this.prisma.notification.create({
      data: {
        userId,
        type: content.type,
        channel: 'IN_APP',
        title: content.title,
        body: content.body,
        campaignId: campaignId ?? null,
      },
    });
    if (opts.email) {
      await this.email.log({ userId, campaignId, ...content });
    }
    return row;
  }

  /** Idempotently subscribe a donor to a campaign's updates. */
  subscribe(donorUserId: string, campaignId: string) {
    return this.prisma.updateSubscription.upsert({
      where: { donorUserId_campaignId: { donorUserId, campaignId } },
      update: {},
      create: { donorUserId, campaignId },
    });
  }

  async listSubscribers(campaignId: string): Promise<string[]> {
    const subs = await this.prisma.updateSubscription.findMany({
      where: { campaignId },
      select: { donorUserId: true },
    });
    return subs.map((s) => s.donorUserId);
  }

  /**
   * Donation side-effects: auto-subscribe + thank the (logged-in) donor, and
   * fan out milestone notifications to all subscribers for each threshold the
   * campaign just crossed.
   */
  async onDonation(event: DonationEvent): Promise<void> {
    if (event.donorUserId) {
      await this.subscribe(event.donorUserId, event.campaignId);
      await this.deliver(
        event.donorUserId,
        thankYouNotification({
          studentName: event.studentName,
          amountCents: event.amountCents,
        }),
        event.campaignId,
        { email: true },
      );
    }

    const milestones = crossedMilestones(
      event.prevRaised,
      event.newRaised,
      event.goalCents,
    );
    if (milestones.length === 0) return;

    const subscribers = await this.listSubscribers(event.campaignId);
    for (const m of milestones) {
      const content = milestoneNotification({
        percent: m,
        studentName: event.studentName,
      });
      for (const uid of subscribers) {
        await this.deliver(uid, content, event.campaignId, { email: true });
      }
    }
  }

  /** Impact-update fan-out: notify every subscriber of the campaign. */
  async onImpactUpdate(event: ImpactUpdateEvent): Promise<void> {
    const subscribers = await this.listSubscribers(event.campaignId);
    if (subscribers.length === 0) return;
    const content = impactUpdateNotification({
      studentName: event.studentName,
      updateTitle: event.updateTitle,
    });
    for (const uid of subscribers) {
      await this.deliver(uid, content, event.campaignId, { email: true });
    }
  }

  async listForUser(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, channel: 'IN_APP' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { userId, channel: 'IN_APP', readAt: null },
      }),
    ]);
    return { items, unread };
  }

  async markRead(userId: string, id: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n)
      throw new DomainException('NOT_FOUND', 'Notification not found', 404);
    if (n.userId !== userId) {
      throw new DomainException('FORBIDDEN', 'Not your notification', 403);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async listSubscriptions(donorUserId: string) {
    const subs = await this.prisma.updateSubscription.findMany({
      where: { donorUserId },
      orderBy: { createdAt: 'desc' },
      include: { campaign: { select: { title: true } } },
    });
    return subs.map((s) => ({
      campaignId: s.campaignId,
      campaignTitle: s.campaign.title,
      createdAt: s.createdAt,
    }));
  }
}
