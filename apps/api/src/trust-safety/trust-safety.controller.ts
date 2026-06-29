import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ChargebackService } from './chargeback.service';
import { FlagService } from './flag.service';
import { FraudService } from './fraud.service';
import { ModerationService } from './moderation.service';
import { TrustDashboardService } from './trust-dashboard.service';
import { FlagDecisionDto } from './dto/flag-decision.dto';
import { ModerationDecisionDto } from './dto/moderation-decision.dto';
import { ScoreTransactionDto } from './dto/score-transaction.dto';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';

/**
 * Trust-and-Safety operator console (E9). ADMIN-only. Exposes the moderation
 * queue, fraud signals, chargeback management and the read-only dashboard /
 * heat-map / audit export. Every moderation decision is audited via the reused
 * E6 AuditService inside the services.
 */
@Controller('trust-safety')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TrustSafetyController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly fraud: FraudService,
    private readonly chargebacks: ChargebackService,
    private readonly flags: FlagService,
    private readonly dashboard: TrustDashboardService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.dashboard.dashboard();
  }

  @Get('heat-map')
  getHeatMap() {
    return this.dashboard.heatMap();
  }

  @Get('moderation')
  listModeration(@Query('status') status?: string) {
    return this.moderation.listQueue(status);
  }

  @Post('campaigns/:campaignId/scan')
  scanCampaign(@Param('campaignId') campaignId: string) {
    return this.moderation.scan(campaignId);
  }

  @Post('moderation/:id/decide')
  decideModeration(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ModerationDecisionDto,
  ) {
    return this.moderation.decide(id, userId, dto);
  }

  @Get('fraud-signals')
  listSignals(
    @Query('donorUserId') donorUserId?: string,
    @Query('kind') kind?: string,
    @Query('take') take?: string,
  ) {
    return this.fraud.listSignals({
      donorUserId,
      kind,
      take: take ? Number(take) : undefined,
    });
  }

  @Post('transactions/:donationId/score')
  scoreTransaction(
    @Param('donationId') donationId: string,
    @Body() dto: ScoreTransactionDto,
  ) {
    return this.fraud.scoreTransaction(donationId, dto);
  }

  @Get('chargebacks')
  listChargebacks(@Query('status') status?: string) {
    return this.chargebacks.list(status);
  }

  @Post('chargebacks/:id/evidence')
  submitEvidence(@Param('id') id: string, @Body() dto: SubmitEvidenceDto) {
    return this.chargebacks.submitEvidence(id, dto.note);
  }

  @Post('chargebacks/:id/offer-refund')
  offerRefund(@Param('id') id: string) {
    return this.chargebacks.offerRefund(id);
  }

  @Get('flags')
  listFlags(@Query('status') status?: string) {
    return this.flags.list(status);
  }

  @Post('flags/:id/decide')
  decideFlag(@Param('id') id: string, @Body() dto: FlagDecisionDto) {
    return this.flags.decide(id, dto);
  }

  @Get('audit.csv')
  async auditCsv(@Res() res: Response): Promise<void> {
    const csv = await this.dashboard.auditCsv();
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header(
      'Content-Disposition',
      'attachment; filename="moderation-audit.csv"',
    );
    res.send(csv);
  }
}
