import { Logger } from '@nestjs/common';
import { MockPaymentProvider } from './mock-payment.provider';
import { PaymentProvider } from './payment-provider.interface';
import { StripePaymentProvider } from './stripe-payment.provider';

export interface PaymentProviderEnv {
  PAYMENT_PROVIDER?: string;
  STRIPE_SECRET_KEY?: string;
}

/** True only when Stripe is explicitly requested AND a secret key is configured. */
export function shouldUseStripe(env: PaymentProviderEnv): boolean {
  return (
    (env.PAYMENT_PROVIDER ?? 'mock').toLowerCase() === 'stripe' &&
    !!env.STRIPE_SECRET_KEY
  );
}

/**
 * Picks the payment provider from the environment. Default is the deterministic
 * Mock, which runs without any keys. Stripe is used only when both the flag and
 * the secret key are present; if Stripe selection fails for any reason we fall
 * back to Mock so the app never crashes on a missing/broken SDK.
 */
export function createPaymentProvider(
  env: PaymentProviderEnv,
  logger: Logger = new Logger('PaymentProviderFactory'),
): PaymentProvider {
  if (!shouldUseStripe(env)) {
    return new MockPaymentProvider();
  }
  try {
    logger.log('Using StripePaymentProvider (PAYMENT_PROVIDER=stripe)');
    return new StripePaymentProvider(env.STRIPE_SECRET_KEY as string);
  } catch (error) {
    logger.warn(
      `Stripe unavailable, falling back to Mock: ${(error as Error).message}`,
    );
    return new MockPaymentProvider();
  }
}
