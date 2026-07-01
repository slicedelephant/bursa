import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../common/domain.exception';
import { verifyWebhookSignature } from '../security/webhook-signature';

/**
 * E20 — guards the local-payment status webhook. Reuses the exact E6 signature scheme
 * (`verifyWebhookSignature`: HMAC-SHA256 over `${timestamp}.${rawBody}`, timing-safe,
 * with a replay window), only with its own header (`x-local-payment-signature`) and its
 * own secret (`LOCAL_PAYMENT_WEBHOOK_SECRET`). Requires the app created with
 * `{ rawBody: true }` (already the case since E6). Fails closed with 400 INVALID_SIGNATURE.
 */
@Injectable()
export class LocalPaymentWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = this.config.get<string>('LOCAL_PAYMENT_WEBHOOK_SECRET');
    const header = request.headers?.['x-local-payment-signature'];
    const raw = request.rawBody;
    const rawBody =
      typeof raw === 'string'
        ? raw
        : Buffer.isBuffer(raw)
          ? raw.toString('utf8')
          : JSON.stringify(request.body ?? {});

    const ok = verifyWebhookSignature({
      rawBody,
      header,
      secret,
      nowSec: Math.floor(Date.now() / 1000),
    });

    if (!ok) {
      throw new DomainException(
        'INVALID_SIGNATURE',
        'Local payment webhook signature verification failed.',
        400,
      );
    }
    return true;
  }
}
