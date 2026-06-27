import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CorporateService } from './corporate.service';
import { SponsorDto } from './dto/sponsor.dto';

/**
 * Corporate channel endpoints. JSON routes use the standard {success,data}
 * envelope; the two export routes stream text/csv and application/pdf directly
 * via @Res(), which bypasses the response interceptor (binary/text downloads).
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SPONSOR)
export class CorporateController {
  constructor(private readonly corporate: CorporateService) {}

  @Post('campaigns/:campaignId/corporate/sponsor')
  sponsor(
    @CurrentUser('id') userId: string,
    @Param('campaignId') campaignId: string,
    @Body() dto: SponsorDto,
  ) {
    return this.corporate.sponsor(campaignId, userId, dto);
  }

  @Get('sponsors/me/esg')
  esg(@CurrentUser('id') userId: string) {
    return this.corporate.esg(userId);
  }

  @Get('sponsors/me/esg/export.csv')
  async esgCsv(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.corporate.esgCsv(userId);
    res
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="bursa-esg-report.csv"')
      .send(csv);
  }

  @Get('sponsors/me/esg/export.pdf')
  async esgPdf(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.corporate.esgPdf(userId);
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', 'attachment; filename="bursa-esg-report.pdf"')
      .send(Buffer.from(pdf, 'binary'));
  }

  @Get('sponsors/me/sponsorships/:id/invoice')
  invoice(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.corporate.invoice(userId, id);
  }

  @Post('sponsors/me/sponsorships/:id/settle')
  settle(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.corporate.settle(userId, id);
  }
}
