import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { CreateGrantDto } from './dto/create-grant.dto';
import { DiversityDto } from './dto/diversity.dto';
import { GenerateReportDto } from './dto/generate-report.dto';
import { TagEntryDto } from './dto/tag-entry.dto';
import { EsgService } from './esg.service';
import { parseReportStandard } from './esg-standard-mapper';

/**
 * E14 — Admin CSRD/ESG reporting endpoints. JSON routes use the {success,data}
 * envelope; the two export routes stream text/csv and application/pdf via @Res()
 * (bypassing the response interceptor). All routes require an ADMIN.
 */
@Controller('admin/esg')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class EsgAdminController {
  constructor(private readonly esg: EsgService) {}

  @Post('tags')
  tag(@CurrentUser('id') userId: string, @Body() dto: TagEntryDto) {
    return this.esg.tagEntry(userId, dto);
  }

  @Put('diversity/:studentProfileId')
  diversity(
    @Param('studentProfileId') studentProfileId: string,
    @Body() dto: DiversityDto,
  ) {
    return this.esg.setDiversity(studentProfileId, dto);
  }

  @Get('report')
  report(@Query('standard') standard: string, @Query('year') year?: string) {
    const parsed = parseReportStandard(standard);
    const y = year ? Number(year) : new Date().getFullYear();
    return this.esg.buildReport(parsed, y);
  }

  @Post('reports')
  createReport(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateReportDto,
  ) {
    const y = dto.year ?? new Date().getFullYear();
    return this.esg.createReport(userId, dto.standard, y);
  }

  @Get('reports')
  listReports() {
    return this.esg.listReports();
  }

  @Get('reports/:id/export.csv')
  async exportCsv(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.esg.reportCsv(userId, id);
    res
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="bursa-csrd-report-${id}.csv"`,
      )
      .send(csv);
  }

  @Get('reports/:id/export.pdf')
  async exportPdf(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.esg.reportPdf(userId, id);
    res
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="bursa-csrd-report-${id}.pdf"`,
      )
      .send(Buffer.from(pdf, 'binary'));
  }

  @Get('data-quality')
  dataQuality() {
    return this.esg.dataQuality();
  }

  @Get('trend')
  trend() {
    return this.esg.trend();
  }

  @Post('auditor-grants')
  createGrant(@CurrentUser('id') userId: string, @Body() dto: CreateGrantDto) {
    return this.esg.createGrant(userId, dto);
  }

  @Post('auditor-grants/:id/revoke')
  revokeGrant(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.esg.revokeGrant(userId, id);
  }

  @Get('auditor-grants')
  listGrants() {
    return this.esg.listGrants();
  }
}
