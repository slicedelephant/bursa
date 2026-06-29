import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, VerificationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ApproveCampaignDto } from './dto/approve-campaign.dto';
import { ImportAdmissionsDto } from './dto/import-admissions.dto';
import { RejectReasonDto } from './dto/reject-reason.dto';
import { SavePayoutDto } from './dto/save-payout.dto';
import { SignAgreementDto } from './dto/sign-agreement.dto';
import { SchoolAdmissionsService } from './school-admissions.service';
import { SchoolCampaignsService } from './school-campaigns.service';
import { SchoolOnboardingService } from './school-onboarding.service';
import { SchoolPortalService } from './school-portal.service';
import { SchoolWebhookService } from './school-webhook.service';

/** Self-serve school-admin portal (E8). Every route is scoped to the caller's school. */
@Controller('school')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN)
export class SchoolPortalController {
  constructor(
    private readonly portal: SchoolPortalService,
    private readonly onboarding: SchoolOnboardingService,
    private readonly admissions: SchoolAdmissionsService,
    private readonly campaigns: SchoolCampaignsService,
    private readonly webhooks: SchoolWebhookService,
  ) {}

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.portal.getMySchool(userId);
  }

  @Get('dashboard')
  dashboard(@CurrentUser('id') userId: string) {
    return this.portal.dashboard(userId);
  }

  @Put('payout')
  async savePayout(@CurrentUser('id') userId: string, @Body() dto: SavePayoutDto) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.onboarding.savePayout(schoolId, dto);
  }

  @Post('agreement/sign')
  async signAgreement(@CurrentUser('id') userId: string, @Body() dto: SignAgreementDto) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.onboarding.signAgreement(schoolId, dto);
  }

  @Post('admissions/import')
  async importAdmissions(
    @CurrentUser('id') userId: string,
    @Body() dto: ImportAdmissionsDto,
  ) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.admissions.import(schoolId, dto.csv);
  }

  @Get('admissions')
  async listAdmissions(
    @CurrentUser('id') userId: string,
    @Query('status') status?: VerificationStatus,
  ) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.admissions.list(schoolId, status);
  }

  @Post('admissions/:id/verify')
  async verifyAdmission(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.admissions.verify(schoolId, id, userId);
  }

  @Post('admissions/:id/reject')
  async rejectAdmission(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RejectReasonDto,
  ) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.admissions.reject(schoolId, id, userId, dto.note);
  }

  @Get('campaigns')
  async listCampaigns(@CurrentUser('id') userId: string) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.campaigns.listForApproval(schoolId);
  }

  @Post('campaigns/:id/approve')
  async approveCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ApproveCampaignDto,
  ) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.campaigns.approve(schoolId, id, userId, dto);
  }

  @Post('campaigns/:id/reject')
  async rejectCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RejectReasonDto,
  ) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.campaigns.reject(schoolId, id, userId, dto.note);
  }

  @Get('webhooks')
  async webhookLog(@CurrentUser('id') userId: string) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.webhooks.list(schoolId);
  }
}
