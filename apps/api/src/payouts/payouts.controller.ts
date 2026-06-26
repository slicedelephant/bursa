import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { PayoutsService } from './payouts.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post('campaigns/:campaignId/payout')
  disburse(@Param('campaignId') campaignId: string) {
    return this.payouts.disburse(campaignId);
  }

  @Get('payouts')
  list() {
    return this.payouts.listPayouts();
  }
}
