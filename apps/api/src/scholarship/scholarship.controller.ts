/**
 * E19 — Scholarship Program Manager: owner (SPONSOR) surface. All routes are
 * JWT + role gated; the program is owner-scoped in the service. Award routes
 * disburse to the SCHOOL only. Report routes stream CSV/PDF (no envelope).
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProgramDto } from './dto/create-program.dto';
import { FormSchemaDto } from './dto/form-schema.dto';
import {
  AddReviewerDto,
  DecideAwardsDto,
  MessageScholarDto,
  ReleaseTrancheDto,
  RenewProgramDto,
  ScholarStatusDto,
} from './dto/misc.dto';
import { ReviewScoreDto } from './dto/review-score.dto';
import { ScholarshipService } from './scholarship.service';

@Controller('scholarship')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SPONSOR)
export class ScholarshipController {
  constructor(private readonly scholarship: ScholarshipService) {}

  @Post('programs')
  createProgram(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProgramDto,
  ) {
    return this.scholarship.createProgram(userId, dto);
  }

  @Get('programs')
  listPrograms(@CurrentUser('id') userId: string) {
    return this.scholarship.listPrograms(userId);
  }

  @Get('programs/:id')
  getProgram(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scholarship.getProgram(userId, id);
  }

  @Put('programs/:id/form')
  setForm(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: FormSchemaDto,
  ) {
    return this.scholarship.setForm(userId, id, dto);
  }

  @Post('programs/:id/reviewers')
  addReviewer(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddReviewerDto,
  ) {
    return this.scholarship.addReviewer(userId, id, dto);
  }

  @Post('programs/:id/application-slot')
  createSlot(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scholarship.createApplicationSlot(userId, id);
  }

  @Get('programs/:id/applications')
  listApplications(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scholarship.listApplications(userId, id);
  }

  @Post('applications/:id/scores')
  score(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReviewScoreDto,
  ) {
    return this.scholarship.scoreApplication(userId, id, dto);
  }

  @Post('programs/:id/decide')
  decide(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: DecideAwardsDto,
  ) {
    return this.scholarship.decide(userId, id, dto);
  }

  @Post('awards/:id/disburse')
  disburse(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scholarship.disburse(userId, id);
  }

  @Post('awards/:id/release-tranche')
  releaseTranche(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReleaseTrancheDto,
  ) {
    return this.scholarship.releaseTranche(userId, id, dto);
  }

  @Get('programs/:id/scholars')
  listScholars(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.scholarship.listScholars(userId, id);
  }

  @Put('scholars/:id/status')
  setScholarStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ScholarStatusDto,
  ) {
    return this.scholarship.setScholarStatus(userId, id, dto);
  }

  @Post('scholars/:id/message')
  messageScholar(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: MessageScholarDto,
  ) {
    return this.scholarship.messageScholar(userId, id, dto);
  }

  @Get('programs/:id/report.csv')
  async reportCsv(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const csv = await this.scholarship.reportCsv(userId, id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="scholarship-report-${id}.csv"`,
    );
    res.send(csv);
  }

  @Get('programs/:id/report.pdf')
  async reportPdf(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.scholarship.reportPdf(userId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="scholarship-report-${id}.pdf"`,
    );
    res.send(Buffer.from(pdf, 'binary'));
  }

  @Post('programs/:id/renew')
  renew(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RenewProgramDto,
  ) {
    return this.scholarship.renew(userId, id, dto);
  }
}
