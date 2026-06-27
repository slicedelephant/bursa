import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../common/domain.exception';
import { verifyWebhookSignature } from './webhook-signature';

/**
 * Guards the payment webhook: only requests carrying a valid Stripe-style
 * signature over the raw body (HMAC with STRIPE_WEBHOOK_SECRET) are admitted.
 * Requires the app to be created with `{ rawBody: true }` so `req.rawBody` holds
 * the exact signed bytes. Fails closed with 400 INVALID_SIGNATURE.
 */
@Injectable()
export class StripeWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    const header = request.headers?.['stripe-signature'];
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
        'Webhook signature verification failed.',
        400,
      );
    }
    return true;
  }
}
