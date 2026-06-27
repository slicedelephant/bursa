import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { DonorsService } from './donors.service';

@Controller('donors/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DONOR)
export class DonorsController {
  constructor(
    private readonly donors: DonorsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('history')
  history(@CurrentUser('id') userId: string) {
    return this.donors.history(userId);
  }

  @Get('donations/:id/receipt')
  receipt(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.donors.receipt(userId, id);
  }

  @Get('subscriptions')
  subscriptions(@CurrentUser('id') userId: string) {
    return this.notifications.listSubscriptions(userId);
  }
}
