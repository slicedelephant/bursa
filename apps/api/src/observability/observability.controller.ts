import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AnalyticsService } from './analytics.service';
import { MetricsService } from './metrics.service';
import { PaymentMonitorService } from './payment-monitor.service';

/**
 * Operator dashboard surface (ADMIN only): funnel, system metrics, SLO/burn-rate
 * and derived payment alerts. Read-only aggregation; touches no money state.
 */
@Controller('observability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ObservabilityController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly metrics: MetricsService,
    private readonly paymentMonitor: PaymentMonitorService,
  ) {}

  @Get('funnel')
  async funnel(@Query('campaignId') campaignId?: string) {
    const [donation, onboarding] = await Promise.all([
      this.analytics.funnel(campaignId),
      this.analytics.onboardingFunnel(),
    ]);
    return { donation, onboarding };
  }

  @Get('metrics')
  snapshot() {
    return this.metrics.snapshot();
  }

  @Get('slo')
  slo() {
    return this.metrics.slo();
  }

  @Get('payment-alerts')
  paymentAlerts() {
    return this.paymentMonitor.alerts();
  }
}
