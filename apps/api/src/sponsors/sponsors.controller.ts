import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { UpsertCompanyDto } from './dto/upsert-company.dto';
import { SponsorsService } from './sponsors.service';

@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR)
  upsertProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertCompanyDto,
  ) {
    return this.sponsors.upsertProfile(userId, dto);
  }

  @Get('me/impact')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR)
  impact(@CurrentUser('id') userId: string) {
    return this.sponsors.impact(userId);
  }

  @Get('donations/:id/receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR)
  receipt(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sponsors.receipt(userId, id);
  }
}
