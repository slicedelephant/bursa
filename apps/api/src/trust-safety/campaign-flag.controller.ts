import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { RateLimit } from '../security/rate-limit.decorator';
import { CreateFlagDto } from './dto/create-flag.dto';
import { FlagService } from './flag.service';

/**
 * Public community-flag endpoint (E9). A logged-in reporter is attributed via
 * OptionalJwt; anonymous reporters use a client visitorId. Protected by the
 * reused E6 velocity rate-limit (no CAPTCHA — see spec Out-of-Scope).
 */
@Controller('campaigns/:campaignId/flags')
export class CampaignFlagController {
  constructor(private readonly flags: FlagService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(OptionalJwtAuthGuard)
  @RateLimit({ limit: 5, windowMs: 60_000, name: 'campaign-flag' })
  create(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateFlagDto,
  ) {
    return this.flags.create(campaignId, dto, user?.id);
  }
}
