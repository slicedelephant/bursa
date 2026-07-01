import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { HrisWebhookDto } from './dto/payroll.dto';
import { HrisWebhookGuard } from './hris-webhook.guard';

/**
 * E21 — signed HRIS sync-status webhook. Only requests with a valid
 * `x-hris-signature` (E6 HMAC scheme) are admitted; the guard fails closed with
 * 400 INVALID_SIGNATURE. Updates the connection status. No money logic here — the
 * matched gift stays on the E2/E12 school-payout path.
 */
@Controller('payroll')
export class HrisWebhookController {
  constructor(private readonly payroll: PayrollService) {}

  @Post('webhook')
  @UseGuards(HrisWebhookGuard)
  handle(@Body() dto: HrisWebhookDto) {
    return this.payroll.applyWebhook(dto);
  }
}
