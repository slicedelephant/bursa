import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPaymentProvider } from './payment-provider.factory';
import { PAYMENT_PROVIDER } from './payment-provider.interface';

/**
 * Global so any feature module can inject `@Inject(PAYMENT_PROVIDER)`.
 * The concrete provider is chosen at runtime by the factory:
 * Mock by default, Stripe when PAYMENT_PROVIDER=stripe and a key is present.
 */
@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createPaymentProvider(
          {
            PAYMENT_PROVIDER: config.get<string>('PAYMENT_PROVIDER'),
            STRIPE_SECRET_KEY: config.get<string>('STRIPE_SECRET_KEY'),
          },
          new Logger('PaymentProviderFactory'),
        ),
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
