import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, VerificationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AdminMfaGuard } from '../security/admin-mfa.guard';
import { AdminService } from './admin.service';
import { RejectDto } from './dto/reject.dto';
import { VerifyDto } from './dto/verify.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('verifications')
  listVerifications(@Query('status') status?: VerificationStatus) {
    return this.admin.listVerifications(status ?? VerificationStatus.PENDING);
  }

  // Verifying a campaign unlocks the money path → require TOTP step-up when
  // ADMIN_TOTP_SECRET is configured (no-op otherwise, so dev stays frictionless).
  @Post('campaigns/:id/verify')
  @UseGuards(AdminMfaGuard)
  verify(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyDto,
  ) {
    return this.admin.verify(id, userId, dto);
  }

  @Post('campaigns/:id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectDto,
  ) {
    return this.admin.reject(id, userId, dto);
  }
}
