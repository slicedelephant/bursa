import { Injectable } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { AuthUser } from '../common/current-user.decorator';
import { DomainException } from '../common/domain.exception';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { VISIBLE_STATUSES, toCard, toDetail } from './campaign.mapper';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateUpdateDto } from './dto/create-update.dto';
import { GalleryQueryDto } from './dto/gallery-query.dto';
import { SubmitCampaignDto } from './dto/submit-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

const VISIBLE: CampaignStatus[] = [...VISIBLE_STATUSES];

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createForUser(userId: string, dto: CreateCampaignDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: { campaign: true },
    });
    if (!profile) {
      throw new DomainException(
        'VALIDATION_ERROR',
        'Create your student profile before starting a campaign',
      );
    }
    if (profile.campaign) {
      throw new DomainException('CONFLICT', 'You already have a campaign', 409);
    }
    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
    });
    if (!school)
      throw new DomainException('NOT_FOUND', 'School not found', 404);

    return this.prisma.campaign.create({
      data: {
        studentProfileId: profile.id,
        schoolId: dto.schoolId,
        programName: dto.programName,
        title: dto.title,
        story: dto.story,
        goalCents: dto.goalCents,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        videoUrl: dto.videoUrl ?? null,
        storyBackground: dto.storyBackground ?? null,
        storyChallenge: dto.storyChallenge ?? null,
        storyVision: dto.storyVision ?? null,
      },
    });
  }

  async updateForUser(userId: string, id: string, dto: UpdateCampaignDto) {
    await this.ownedDraft(userId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.schoolId !== undefined ? { schoolId: dto.schoolId } : {}),
        ...(dto.programName !== undefined
          ? { programName: dto.programName }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.story !== undefined ? { story: dto.story } : {}),
        ...(dto.goalCents !== undefined ? { goalCents: dto.goalCents } : {}),
        ...(dto.deadline !== undefined
          ? { deadline: new Date(dto.deadline) }
          : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.storyBackground !== undefined
          ? { storyBackground: dto.storyBackground }
          : {}),
        ...(dto.storyChallenge !== undefined
          ? { storyChallenge: dto.storyChallenge }
          : {}),
        ...(dto.storyVision !== undefined
          ? { storyVision: dto.storyVision }
          : {}),
      },
    });
  }

  async submitForUser(userId: string, id: string, dto: SubmitCampaignDto) {
    await this.ownedDraft(userId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.admissionVerification.upsert({
        where: { campaignId: id },
        update: { status: 'PENDING', admissionRef: dto.admissionRef },
        create: {
          campaignId: id,
          status: 'PENDING',
          admissionRef: dto.admissionRef,
        },
      });
      return tx.campaign.update({
        where: { id },
        data: { status: 'PENDING_VERIFICATION' },
      });
    });
  }

  async gallery(q: GalleryQueryDto) {
    const statuses: CampaignStatus[] = q.status ? [q.status] : VISIBLE;
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: { in: statuses },
        verification: { status: 'VERIFIED' },
        ...(q.schoolId ? { schoolId: q.schoolId } : {}),
        ...(q.country
          ? {
              studentProfile: {
                country: { equals: q.country, mode: 'insensitive' },
              },
            }
          : {}),
        ...(q.q
          ? {
              OR: [
                { title: { contains: q.q, mode: 'insensitive' } },
                {
                  studentProfile: {
                    fullName: { contains: q.q, mode: 'insensitive' },
                  },
                },
                { school: { name: { contains: q.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { studentProfile: true, school: true, verification: true },
      orderBy: { createdAt: 'desc' },
    });
    return campaigns.map(toCard);
  }

  async detail(id: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        school: true,
        verification: true,
        payout: true,
        donations: {
          where: { status: { in: ['SUCCEEDED', 'PLEDGED', 'CAPTURED'] } },
          orderBy: { createdAt: 'desc' },
          include: { corporateProfile: { select: { companyName: true } } },
        },
        updates: { orderBy: { createdAt: 'desc' } },
        sponsorships: {
          orderBy: { createdAt: 'desc' },
          include: {
            corporateProfile: { select: { companyName: true, logoUrl: true } },
          },
        },
      },
    });
    if (
      !c ||
      c.verification?.status !== 'VERIFIED' ||
      !VISIBLE.includes(c.status)
    ) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }
    return toDetail(c);
  }

  async stats() {
    const verified = {
      status: { in: VISIBLE },
      verification: { status: 'VERIFIED' as const },
    };
    const [agg, funded, live, schools] = await Promise.all([
      this.prisma.campaign.aggregate({
        _sum: { raisedCents: true },
        where: verified,
      }),
      this.prisma.campaign.count({
        where: {
          status: { in: ['FUNDED', 'DISBURSED'] as CampaignStatus[] },
          verification: { status: 'VERIFIED' },
        },
      }),
      this.prisma.campaign.count({
        where: { status: 'LIVE', verification: { status: 'VERIFIED' } },
      }),
      this.prisma.campaign.findMany({
        where: verified,
        select: { schoolId: true },
        distinct: ['schoolId'],
      }),
    ]);
    return {
      totalRaisedCents: agg._sum.raisedCents ?? 0,
      studentsFunded: funded,
      campaignsLive: live,
      schools: schools.length,
    };
  }

  listUpdates(campaignId: string) {
    return this.prisma.campaignUpdate.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async postUpdate(user: AuthUser, campaignId: string, dto: CreateUpdateDto) {
    const c = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { studentProfile: true },
    });
    if (!c) throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    const isOwner = c.studentProfile.userId === user.id;
    if (!isOwner && user.role !== 'ADMIN') {
      throw new DomainException('FORBIDDEN', 'Not allowed to post here', 403);
    }
    const update = await this.prisma.campaignUpdate.create({
      data: {
        campaignId,
        authorId: user.id,
        title: dto.title,
        body: dto.body,
        type: 'MANUAL',
      },
    });
    await this.notifications.onImpactUpdate({
      campaignId,
      studentName: c.studentProfile.fullName,
      updateTitle: dto.title,
    });
    return update;
  }

  private async ownedDraft(userId: string, id: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id },
      include: { studentProfile: true },
    });
    if (!c) throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    if (c.studentProfile.userId !== userId) {
      throw new DomainException('FORBIDDEN', 'Not your campaign', 403);
    }
    if (c.status !== 'DRAFT') {
      throw new DomainException(
        'CONFLICT',
        'Campaign can no longer be edited',
        409,
      );
    }
    return c;
  }
}
