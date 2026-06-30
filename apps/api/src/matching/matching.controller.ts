import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { RateLimit } from '../security/rate-limit.decorator';
import { ClaimMatchDto } from './dto/claim-match.dto';
import { DetectMatchDto } from './dto/detect-match.dto';
import { MatchOfferDto } from './dto/match-offer.dto';
import { MatchingService } from './matching.service';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Post('detect')
  @RateLimit({ limit: 20, windowMs: 60_000, name: 'matching-detect' })
  @UseGuards(OptionalJwtAuthGuard)
  detect(@Body() dto: DetectMatchDto, @CurrentUser('id') donorUserId?: string) {
    return this.matching.detect(dto.workEmail, dto.locale, donorUserId);
  }

  @Post('offer')
  @UseGuards(OptionalJwtAuthGuard)
  offer(@Body() dto: MatchOfferDto, @CurrentUser('id') donorUserId?: string) {
    return this.matching.offer(
      dto.campaignId,
      dto.donationCents,
      dto.locale,
      dto.workEmail,
      donorUserId,
    );
  }

  @Post('claim')
  @RateLimit({ limit: 10, windowMs: 60_000, name: 'matching-claim' })
  @UseGuards(OptionalJwtAuthGuard)
  claim(@Body() dto: ClaimMatchDto, @CurrentUser('id') donorUserId?: string) {
    return this.matching.claim(
      dto.donationId,
      dto.locale,
      dto.workEmail,
      donorUserId,
    );
  }

  @Get('me/balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DONOR)
  balance(@CurrentUser('id') userId: string) {
    return this.matching.balance(userId);
  }

  @Get('me/claims/:id/document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DONOR)
  @Header('Content-Type', 'application/pdf')
  async document(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.matching.claimDocument(userId, id);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="match-claim-${id}.pdf"`,
    );
    res.send(Buffer.from(pdf, 'binary'));
  }
}
