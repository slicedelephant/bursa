import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { SchoolPortalService } from '../schools/school-portal.service';
import { ReconciliationService } from './reconciliation.service';

/**
 * E12 — Payout reconciliation endpoints for a school admin. Scoped to the caller's
 * own school (E8 `resolveSchoolId`). JSON routes use the standard {success,data}
 * envelope; the export routes stream text/csv and application/pdf directly via
 * @Res() (bypassing the response interceptor), exactly like the E5 corporate
 * export. Read-only — the money path is never mutated.
 */
@Controller('school')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN)
export class ReconciliationController {
  constructor(
    private readonly reconciliation: ReconciliationService,
    private readonly portal: SchoolPortalService,
  ) {}

  @Get('reconciliation')
  async run(@CurrentUser('id') userId: string) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.reconciliation.reconcile(schoolId);
  }

  @Get('reconciliation/payouts')
  async payouts(@CurrentUser('id') userId: string) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.reconciliation.payoutRows(schoolId);
  }

  @Get('reconciliation/export.csv')
  async exportCsv(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const schoolId = await this.portal.resolveSchoolId(userId);
    const csv = await this.reconciliation.exportCsv(schoolId);
    res
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="bursa-payouts.csv"')
      .send(csv);
  }

  @Get('reconciliation/export.pdf')
  async exportPdf(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const schoolId = await this.portal.resolveSchoolId(userId);
    const pdf = await this.reconciliation.exportPdf(schoolId);
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'attachment; filename="bursa-payouts.pdf"')
      .send(Buffer.from(pdf, 'binary'));
  }

  @Get('reconciliation/tax-report.csv')
  async taxReport(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const schoolId = await this.portal.resolveSchoolId(userId);
    const csv = await this.reconciliation.taxReportCsv(schoolId);
    res
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        'attachment; filename="bursa-tax-report.csv"',
      )
      .send(csv);
  }

  @Get('reconciliation/accounting.csv')
  async accounting(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const schoolId = await this.portal.resolveSchoolId(userId);
    const csv = await this.reconciliation.accountingCsv(schoolId);
    res
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        'attachment; filename="bursa-accounting.csv"',
      )
      .send(csv);
  }
}
