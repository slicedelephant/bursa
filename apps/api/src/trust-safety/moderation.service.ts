import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../security/audit.service';
import { ModerationDecisionDto } from './dto/moderation-decision.dto';
import { decideModeration, evaluateCampaign } from './moderation-rules';

const DUPLICATE_SAMPLE = 25;

/**
 * Campaign moderation queue (E9). Auto-flag scoring lives in the pure
 * `moderation-rules.ts`; every operator decision is written to the reused E6
 * AuditLog (who/when/action/reason/result) and a REJECT freezes the campaign —
 * a status flag only, never touching the money path.
 */
@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Queue ordered by risk score (default: OPEN cases). */
  async listQueue(status?: string) {
    const cases = await this.prisma.moderationCase.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: [{ riskScore: 'desc' }, { createdAt: 'desc' }],
      include: { campaign: { select: { title: true, frozen: true } } },
    });
    return cases.map((c) => ({
      id: c.id,
      campaignId: c.campaignId,
      campaignTitle: c.campaign?.title ?? null,
      campaignFrozen: c.campaign?.frozen ?? false,
      status: c.status,
      riskScore: c.riskScore,
      riskLevel: c.riskLevel,
      reasons: c.reasons,
      autoFlagged: c.autoFlagged,
      decisionNote: c.decisionNote,
      reviewedAt: c.reviewedAt,
      createdAt: c.createdAt,
    }));
  }

  /** Re-runs the auto-flag rules and upserts the case (idempotent per campaign). */
  async scan(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { school: { select: { country: true } } },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }

    const [openFlagCount, others] = await Promise.all([
      this.prisma.campaignFlag.count({
        where: { campaignId, status: 'OPEN' },
      }),
      this.prisma.campaign.findMany({
        where: { id: { not: campaignId }, schoolId: campaign.schoolId },
        select: { title: true, story: true },
        take: DUPLICATE_SAMPLE,
      }),
    ]);

    const evaluation = evaluateCampaign({
      title: campaign.title,
      story: campaign.story,
      country: campaign.school?.country,
      openFlagCount,
      others,
    });

    const data = {
      status: 'OPEN' as const,
      riskScore: evaluation.riskScore,
      riskLevel: evaluation.riskLevel,
      reasons: evaluation.reasons as unknown as Prisma.InputJsonValue,
      autoFlagged: evaluation.autoFlagged,
    };

    return this.prisma.moderationCase.upsert({
      where: { campaignId },
      update: data,
      create: { campaignId, ...data },
    });
  }

  /** Applies an operator decision; REJECT freezes the campaign. */
  async decide(id: string, reviewerId: string, dto: ModerationDecisionDto) {
    const existing = await this.prisma.moderationCase.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new DomainException('NOT_FOUND', 'Moderation case not found', 404);
    }

    let decision;
    try {
      decision = decideModeration(existing.status, dto.action);
    } catch {
      throw new DomainException(
        'MODERATION_NOT_OPEN',
        'Only an open moderation case can be decided',
        409,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.moderationCase.update({
        where: { id },
        data: {
          status: decision.status,
          decisionNote: dto.note,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
      if (decision.freezeCampaign) {
        await tx.campaign.update({
          where: { id: existing.campaignId },
          data: {
            frozen: true,
            frozenAt: new Date(),
            freezeReason: `moderation_reject: ${dto.note}`,
          },
        });
      }
      return next;
    });

    await this.audit.record({
      action: `moderation.${dto.action.toLowerCase()}`,
      actorUserId: reviewerId,
      targetType: 'Campaign',
      targetId: existing.campaignId,
      metadata: {
        caseId: id,
        note: dto.note,
        result: decision.status,
        froze: decision.freezeCampaign,
        riskScore: existing.riskScore,
      },
    });

    return updated;
  }
}
