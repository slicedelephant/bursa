import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { PortfolioService } from './portfolio.service';

/**
 * Donor portfolio endpoints (E16). The JSON route uses the standard {success,data}
 * envelope; the two export routes stream text/csv and application/pdf directly via
 * @Res(), which bypasses the response interceptor. DONOR-gated, like the E4 account.
 */
@Controller('donors/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DONOR)
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get('portfolio')
  get(@CurrentUser('id') userId: string) {
    return this.portfolio.portfolio(userId);
  }

  @Get('portfolio/export.csv')
  async csv(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.portfolio.portfolioCsv(userId);
    res
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        'attachment; filename="bursa-portfolio.csv"',
      )
      .send(csv);
  }

  @Get('portfolio/export.pdf')
  async pdf(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.portfolio.portfolioPdf(userId);
    res
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        'attachment; filename="bursa-portfolio.pdf"',
      )
      .send(Buffer.from(pdf, 'binary'));
  }
}
