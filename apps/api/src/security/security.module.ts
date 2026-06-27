import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AdminMfaGuard } from './admin-mfa.guard';
import { AuditService } from './audit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitStore } from './rate-limit.store';
import { StripeWebhookGuard } from './stripe-webhook.guard';
import { WebhookController } from './webhook.controller';

/**
 * Cross-cutting security module: in-memory rate limiting (global guard),
 * webhook signature + admin MFA guards, the audit log and GDPR account service.
 * Dependency-free and stateless except for the per-instance rate-limit store and
 * the Postgres-backed audit log — no new external infrastructure.
 */
@Module({
  controllers: [AccountController, WebhookController],
  providers: [
    RateLimitStore,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    StripeWebhookGuard,
    AdminMfaGuard,
    AuditService,
    AccountService,
  ],
  exports: [AuditService, AdminMfaGuard, RateLimitStore],
})
export class SecurityModule {}
