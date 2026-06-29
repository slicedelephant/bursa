import { Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { AnalyticsService } from '../observability/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlagDto } from './dto/create-flag.dto';
import { FlagDecisionDto } from './dto/flag-decision.dto';

/**
 * Community flagging (E9). Anyone may report a campaign (optionally anonymous
 * via visitorId); each report is persisted and fed best-effort into the reused
 * E7 analytics stream. Open flag volume raises the moderation risk score.
 */
@Injectable()
export class FlagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(
    campaignId: string,
    dto: CreateFlagDto,
    reporterUserId?: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }

    const flag = await this.prisma.campaignFlag.create({
      data: {
        campaignId,
        reporterUserId: reporterUserId ?? null,
        visitorId: dto.visitorId ?? null,
        reason: dto.reason,
        note: dto.note ?? null,
      },
    });

    await this.analytics.record({
      type: 'trust.flag',
      campaignId,
      userId: reporterUserId ?? null,
      visitorId: dto.visitorId ?? null,
      metadata: { reason: dto.reason },
    });

    return { id: flag.id, status: flag.status };
  }

  list(status?: string) {
    return this.prisma.campaignFlag.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async decide(id: string, dto: FlagDecisionDto) {
    const flag = await this.prisma.campaignFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new DomainException('NOT_FOUND', 'Flag not found', 404);
    }
    const status = dto.action === 'REVIEW' ? 'REVIEWED' : 'DISMISSED';
    return this.prisma.campaignFlag.update({
      where: { id },
      data: { status },
    });
  }
}
