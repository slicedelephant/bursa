import { Injectable } from '@nestjs/common';
import { CampaignStatus, UpdateType, VerificationStatus } from '@prisma/client';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { RejectDto } from './dto/reject.dto';
import { VerifyDto } from './dto/verify.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listVerifications(status: VerificationStatus) {
    return this.prisma.campaign.findMany({
      where: { verification: { status } },
      include: { studentProfile: true, school: true, verification: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verify(id: string, adminId: string, dto: VerifyDto) {
    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id },
        include: { school: true, verification: true },
      });
      if (!campaign) {
        throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
      }
      if (!campaign.school.payoutVerified) {
        throw new DomainException(
          'SCHOOL_NOT_VERIFIED',
          'School has no verified payout account',
          409,
        );
      }
      await tx.admissionVerification.upsert({
        where: { campaignId: id },
        update: {
          status: VerificationStatus.VERIFIED,
          verifiedById: adminId,
          verifiedAt: new Date(),
          ...(dto.admissionRef !== undefined ? { admissionRef: dto.admissionRef } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
        },
        create: {
          campaignId: id,
          status: VerificationStatus.VERIFIED,
          verifiedById: adminId,
          verifiedAt: new Date(),
          admissionRef: dto.admissionRef,
          note: dto.note,
        },
      });
      await tx.campaignUpdate.create({
        data: {
          campaignId: id,
          title: 'Admission verified',
          body: 'This student\'s admission has been verified. The campaign is now live.',
          type: UpdateType.SYSTEM,
        },
      });
      return tx.campaign.update({
        where: { id },
        data: { status: CampaignStatus.LIVE },
      });
    });
  }

  async reject(id: string, adminId: string, dto: RejectDto) {
    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({ where: { id } });
      if (!campaign) {
        throw new DomainException('NOT_FOUND', 'Campaign not found', 404);
      }
      await tx.admissionVerification.upsert({
        where: { campaignId: id },
        update: {
          status: VerificationStatus.REJECTED,
          note: dto.note,
          verifiedById: adminId,
          verifiedAt: new Date(),
        },
        create: {
          campaignId: id,
          status: VerificationStatus.REJECTED,
          note: dto.note,
          verifiedById: adminId,
          verifiedAt: new Date(),
        },
      });
      return tx.campaign.update({
        where: { id },
        data: { status: CampaignStatus.REJECTED },
      });
    });
  }
}
