import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FxService } from './fx.service';
import { LocalPaymentWebhookDto } from './dto/fx.dto';
import { LocalPaymentWebhookGuard } from './local-payment-webhook.guard';

/**
 * E20 — signed status webhook for local deposits. Only requests with a valid
 * `x-local-payment-signature` (E6 HMAC scheme) are admitted; the guard fails closed with
 * 400 INVALID_SIGNATURE. Advances a PENDING deposit to SUCCEEDED/FAILED. No payout logic
 * here — the school payout stays on the E2/E12 path.
 */
@Controller('fx')
export class LocalPaymentWebhookController {
  constructor(private readonly fx: FxService) {}

  @Post('webhook')
  @UseGuards(LocalPaymentWebhookGuard)
  handle(@Body() dto: LocalPaymentWebhookDto) {
    return this.fx.applyWebhook(dto);
  }
}
