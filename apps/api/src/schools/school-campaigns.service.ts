import { Injectable } from '@nestjs/common';
import { CampaignStatus, UpdateType, VerificationStatus } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveCampaignDto } from './dto/approve-campaign.dto';
import { canApproveCampaigns } from './onboarding-status';
import { buildCampaignApprovedEvent } from './school-webhook-events';
import { SchoolWebhookService } from './school-webhook.service';

/**
 * Campaign approval (E8): a school-admin reviews and approves/rejects their own
 * students' campaigns before publication. Approval reuses the existing
 * verification transition (admission VERIFIED → campaign LIVE) but scoped to the
 * school and gated on the school being fully onboarded + payout-verified.
 */
@Injectable()
export class SchoolCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: SchoolWebhookService,
  ) {}

  listForApproval(schoolId: string) {
    return this.prisma.campaign.findMany({
      where: { schoolId, status: CampaignStatus.PENDING_VERIFICATION },
      include: { studentProfile: true, verification: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(
    schoolId: string,
    campaignId: string,
    reviewerId: string,
    dto: ApproveCampaignDto,
  ) {
    await this.requireActiveSchool(schoolId);
    await this.requireCampaign(schoolId, campaignId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.admissionVerification.upsert({
        where: { campaignId },
        update: {
          status: VerificationStatus.VERIFIED,
          verifiedById: reviewerId,
          verifiedAt: new Date(),
          ...(dto.admissionRef !== undefined ? { admissionRef: dto.admissionRef } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
        },
        create: {
          campaignId,
          status: VerificationStatus.VERIFIED,
          verifiedById: reviewerId,
          verifiedAt: new Date(),
          admissionRef: dto.admissionRef,
          note: dto.note,
        },
      });
      await tx.campaignUpdate.create({
        data: {
          campaignId,
          authorId: reviewerId,
          title: 'Admission approved by school',
          body: "This student's admission has been approved by the school. The campaign is now live.",
          type: UpdateType.SYSTEM,
        },
      });
      return tx.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.LIVE },
      });
    });
    await this.webhooks.emit(
      buildCampaignApprovedEvent(schoolId, {
        id: updated.id,
        title: updated.title,
        goalCents: updated.goalCents,
      }),
    );
    return updated;
  }

  async reject(schoolId: string, campaignId: string, reviewerId: string, note: string) {
    await this.requireCampaign(schoolId, campaignId);
    return this.prisma.$transaction(async (tx) => {
      await tx.admissionVerification.upsert({
        where: { campaignId },
        update: {
          status: VerificationStatus.REJECTED,
          note,
          verifiedById: reviewerId,
          verifiedAt: new Date(),
        },
        create: {
          campaignId,
          status: VerificationStatus.REJECTED,
          note,
          verifiedById: reviewerId,
          verifiedAt: new Date(),
        },
      });
      return tx.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.REJECTED },
      });
    });
  }

  private async requireActiveSchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      throw new DomainException('NOT_FOUND', 'School not found', 404);
    }
    if (!canApproveCampaigns(school)) {
      throw new DomainException(
        'SCHOOL_NOT_ACTIVE',
        'Complete onboarding (payout + signed agreement) before approving campaigns',
        409,
      );
    }
    return school;
  }

  private async requireCampaign(schoolId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, schoolId },
    });
    if (!campaign) {
      throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
    }
    return campaign;
  }
}
