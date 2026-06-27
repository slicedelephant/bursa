import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { DonationsService } from './donations.service';
import { CardDonationDto } from './dto/card-donation.dto';
import { SepaDonationDto } from './dto/sepa-donation.dto';

@Controller('campaigns/:campaignId/donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Get()
  list(@Param('campaignId') campaignId: string) {
    return this.donations.listDonations(campaignId);
  }

  @Post('card')
  @UseGuards(OptionalJwtAuthGuard)
  card(
    @Param('campaignId') campaignId: string,
    @Body() dto: CardDonationDto,
    @CurrentUser('id') donorUserId?: string,
  ) {
    return this.donations.donateCard(campaignId, dto, donorUserId);
  }

  @Post('sepa')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR)
  sepa(
    @CurrentUser('id') userId: string,
    @Param('campaignId') campaignId: string,
    @Body() dto: SepaDonationDto,
  ) {
    return this.donations.donateSepa(campaignId, userId, dto);
  }
}
