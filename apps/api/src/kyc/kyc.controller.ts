import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { DocumentDto } from './dto/document.dto';
import { LivenessDto } from './dto/liveness.dto';
import { StartCaseDto } from './dto/start-case.dto';
import { KycService } from './kyc.service';

/**
 * Student KYC flow (E11). STUDENT-only. Starts a verification case and runs the
 * liveness and document steps behind the swappable identity provider (Mock by
 * default — no network, no key). Every decision is audited via the reused E6
 * AuditService; the response envelope is added globally.
 */
@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('cases')
  start(@CurrentUser('id') userId: string, @Body() dto: StartCaseDto) {
    return this.kyc.startCase(userId, dto.admissionRecordId);
  }

  @Post('cases/:id/liveness')
  liveness(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: LivenessDto,
  ) {
    return this.kyc.runLiveness(userId, id, dto.livenessToken);
  }

  @Post('cases/:id/document')
  document(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: DocumentDto,
  ) {
    return this.kyc.runDocument(userId, id, dto.documentToken, dto.claimedName);
  }

  @Get('cases/me')
  mine(@CurrentUser('id') userId: string) {
    return this.kyc.listForUser(userId);
  }
}
