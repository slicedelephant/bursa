import { Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { VerifyPayoutDto } from './dto/verify-payout.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.school.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateSchoolDto) {
    return this.prisma.school.create({ data: dto });
  }

  async verifyPayout(id: string, dto: VerifyPayoutDto) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new DomainException('NOT_FOUND', 'School not found', 404);
    return this.prisma.school.update({
      where: { id },
      data: {
        payoutVerified: dto.payoutVerified,
        payoutAccountRef: dto.payoutAccountRef ?? school.payoutAccountRef,
      },
    });
  }
}
