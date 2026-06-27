import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { HealthService } from './health.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { MetricsStore } from './metrics.store';
import { ObservabilityController } from './observability.controller';
import { PaymentMonitorService } from './payment-monitor.service';

/**
 * Cross-cutting observability: a global metrics interceptor records every request
 * into an in-memory store, the analytics service persists privacy-aware funnel
 * events, and the admin controller exposes funnel/metrics/SLO/payment-alert
 * dashboards. Dependency-free and per-instance (no Prometheus/OTel/external infra)
 * — same pragmatic line as the E6 security stores.
 */
@Module({
  controllers: [AnalyticsController, ObservabilityController],
  providers: [
    // Factory so Nest does not try to resolve the numeric `capacity` ctor arg
    // (kept for unit tests that instantiate the store directly).
    { provide: MetricsStore, useFactory: () => new MetricsStore() },
    MetricsService,
    AnalyticsService,
    PaymentMonitorService,
    HealthService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [AnalyticsService, MetricsService],
})
export class ObservabilityModule {}
