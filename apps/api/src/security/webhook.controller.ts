import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { StripeWebhookGuard } from './stripe-webhook.guard';

/**
 * Payment webhook receiver. The StripeWebhookGuard verifies the signature over
 * the raw body before this handler runs, so reaching the body means the event
 * is authentic. Event processing (charge/refund reconciliation) is out of scope
 * for this epic — this endpoint exists to enforce the mandatory signature check.
 */
@Controller('payments/webhook')
export class WebhookController {
  @Post()
  @HttpCode(200)
  @UseGuards(StripeWebhookGuard)
  handle(): { received: true } {
    return { received: true };
  }
}
