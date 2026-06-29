import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { StripeWebhookGuard } from '../security/stripe-webhook.guard';
import { ChargebackService } from './chargeback.service';
import type { ChargebackEvent } from './chargeback.service';

/**
 * Chargeback webhook receiver (E9). The reused E6 StripeWebhookGuard verifies
 * the HMAC signature over the raw body before this handler runs, so reaching the
 * body means the (mocked) Stripe dispute event is authentic. Ingestion is
 * idempotent over the dispute id.
 */
@Controller('trust-safety/webhooks')
export class ChargebackWebhookController {
  constructor(private readonly chargebacks: ChargebackService) {}

  @Post('chargeback')
  @HttpCode(200)
  @UseGuards(StripeWebhookGuard)
  handle(@Body() body: ChargebackEvent) {
    return this.chargebacks.ingest(body);
  }
}
