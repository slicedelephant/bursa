import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { RateLimit } from '../security/rate-limit.decorator';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { HealthService } from './health.service';

/**
 * Public surface: anonymous (but attributable when logged in) product/funnel
 * event ingest, plus the health probe for external synthetic monitoring. Ingest
 * is rate-limited against spam and never blocks the caller on persistence errors.
 */
@Controller()
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly health: HealthService,
  ) {}

  @Post('analytics/events')
  @RateLimit({ limit: 60, windowMs: 60_000, name: 'analytics-ingest' })
  @UseGuards(OptionalJwtAuthGuard)
  async track(
    @Body() dto: TrackEventDto,
    @CurrentUser('id') userId?: string,
    @Req() req?: { requestId?: string },
  ): Promise<{ recorded: true }> {
    await this.analytics.record({
      ...dto,
      userId: userId ?? null,
      requestId: req?.requestId ?? null,
    });
    return { recorded: true };
  }

  @Get('health')
  check() {
    return this.health.check();
  }
}
