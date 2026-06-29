import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { SchoolOnboardingService } from './school-onboarding.service';

/**
 * Public, token-gated hosted onboarding flow (E8, à la Stripe Connect). No JWT —
 * the single-use link token is the credential. Validates/reads onboarding state
 * and completes registration in one step.
 */
@Controller('school/onboarding')
export class SchoolOnboardingController {
  constructor(private readonly onboarding: SchoolOnboardingService) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.onboarding.getOnboardingByToken(token);
  }

  @Post(':token/complete')
  complete(@Param('token') token: string, @Body() dto: CompleteOnboardingDto) {
    return this.onboarding.completeViaToken(token, dto);
  }
}
