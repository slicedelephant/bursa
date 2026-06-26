import { Global, Module } from '@nestjs/common';
import { MockPaymentProvider } from './mock-payment.provider';
import { PAYMENT_PROVIDER } from './payment-provider.interface';

/**
 * Global so any feature module can inject `@Inject(PAYMENT_PROVIDER)`.
 * To go live, swap `useClass` here for a real provider implementing
 * PaymentProvider — no domain code changes.
 */
@Global()
@Module({
  providers: [{ provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider }],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
