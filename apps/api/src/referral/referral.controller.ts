import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { InviteAdvocateDto } from './dto/invite-advocate.dto';
import { LeaderboardOptInDto } from './dto/opt-in.dto';
import { ReferralService } from './referral.service';

/** Donor referral face (E15): link + tracking + opt-in, in the E4 donor account. */
@Controller('donors/me/referral')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DONOR)
export class DonorReferralController {
  constructor(private readonly referral: ReferralService) {}

  @Get()
  get(@CurrentUser('id') userId: string) {
    return this.referral.donorReferral(userId);
  }

  @Post('leaderboard-opt-in')
  optIn(@CurrentUser('id') userId: string, @Body() dto: LeaderboardOptInDto) {
    return this.referral.setLeaderboardOptIn(userId, dto.optIn);
  }
}

/** Anonymous opt-in referral leaderboard (E15). */
@Controller('referral')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DONOR)
export class ReferralLeaderboardController {
  constructor(private readonly referral: ReferralService) {}

  @Get('leaderboard')
  leaderboard() {
    return this.referral.referralLeaderboard();
  }
}

/** Advocate face (E15): student-managed advocate invites + leaderboards per campaign. */
@Controller('campaigns/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvocateController {
  constructor(private readonly referral: ReferralService) {}

  @Post('advocates')
  @Roles(Role.STUDENT)
  invite(
    @CurrentUser('id') userId: string,
    @Param('id') campaignId: string,
    @Body() dto: InviteAdvocateDto,
  ) {
    return this.referral.inviteAdvocate(userId, campaignId, dto);
  }

  @Get('advocates')
  @Roles(Role.STUDENT)
  list(@CurrentUser('id') userId: string, @Param('id') campaignId: string) {
    return this.referral.advocates(userId, campaignId);
  }

  @Get('advocate-leaderboard')
  leaderboard(@Param('id') campaignId: string) {
    return this.referral.advocateLeaderboard(campaignId);
  }
}
