import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { SecurityModule } from '../security/security.module';
import { StripeWebhookGuard } from '../security/stripe-webhook.guard';
import { CampaignFlagController } from './campaign-flag.controller';
import { ChargebackWebhookController } from './chargeback-webhook.controller';
import { ChargebackService } from './chargeback.service';
import { FlagService } from './flag.service';
import { FraudService } from './fraud.service';
import { ModerationService } from './moderation.service';
import { TrustDashboardService } from './trust-dashboard.service';
import { TrustSafetyController } from './trust-safety.controller';

/**
 * E9 Trust-and-Safety Operations Console. Moderation, fraud scoring, chargeback
 * management, freezes, community flagging and the operator dashboard. Reuses E6
 * (AuditService via SecurityModule, StripeWebhookGuard) and E7 (AnalyticsService
 * via ObservabilityModule) — no duplicate audit/metrics systems, no new infra.
 */
@Module({
  imports: [SecurityModule, ObservabilityModule],
  controllers: [
    TrustSafetyController,
    ChargebackWebhookController,
    CampaignFlagController,
  ],
  providers: [
    ModerationService,
    FraudService,
    ChargebackService,
    FlagService,
    TrustDashboardService,
    StripeWebhookGuard,
  ],
})
export class TrustSafetyModule {}
