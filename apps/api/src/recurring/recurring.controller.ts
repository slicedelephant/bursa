import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { RecurringService } from './recurring.service';

@Controller('donors/me/recurring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DONOR)
export class RecurringController {
  constructor(private readonly recurring: RecurringService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.recurring.list(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRecurringDto) {
    return this.recurring.create(userId, dto);
  }

  @Post('run')
  run(@CurrentUser('id') userId: string) {
    return this.recurring.runDue(userId);
  }

  @Post(':id/pause')
  pause(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurring.pause(userId, id);
  }

  @Post(':id/resume')
  resume(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurring.resume(userId, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurring.cancel(userId, id);
  }
}
