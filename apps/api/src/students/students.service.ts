import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  upsertProfile(userId: string, dto: UpsertProfileDto) {
    return this.prisma.studentProfile.upsert({
      where: { userId },
      update: {
        fullName: dto.fullName,
        country: dto.country,
        story: dto.story,
        recommendation: dto.recommendation,
        photoUrl: dto.photoUrl,
      },
      create: {
        userId,
        fullName: dto.fullName,
        country: dto.country,
        story: dto.story,
        recommendation: dto.recommendation,
        photoUrl: dto.photoUrl,
      },
    });
  }

  async me(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        campaign: {
          include: { school: true, verification: true },
        },
      },
    });
    if (!profile) return { profile: null, campaign: null };
    const { campaign, ...rest } = profile;
    return { profile: rest, campaign: campaign ?? null };
  }
}
