/**
 * E20 — Multi-Currency & local payment methods module.
 *
 * Reuses existing infra, does not rebuild it:
 * - PaymentsModule (E2, @Global) — `PaymentProvider.createPayout` to the SCHOOL.
 * - LedgerModule (E12) — append-only DISBURSEMENT entries for every payout.
 * - Binds the local donor-DEPOSIT seam (`LOCAL_DEPOSIT_PROVIDER`, Mock by default) and
 *   the FX-rate seam (`FX_RATE_PROVIDER`, Mock by default) via env-gated factories,
 *   exactly like the E2 payment-provider factory.
 * Money always flows to the school, never to a student (Constitution II).
 */

import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LedgerModule } from '../ledger/ledger.module';
import { LOCAL_DEPOSIT_PROVIDER } from '../payments/local/local-payment.provider.interface';
import { createLocalDepositProvider } from '../payments/local/local-payment.provider.factory';
import { FX_RATE_PROVIDER } from './fx-rate.provider.interface';
import { createFxRateProvider } from './fx-rate.provider.factory';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';
import { LocalPaymentWebhookController } from './local-payment-webhook.controller';
import { LocalPaymentWebhookGuard } from './local-payment-webhook.guard';

@Module({
  imports: [LedgerModule],
  controllers: [FxController, LocalPaymentWebhookController],
  providers: [
    FxService,
    LocalPaymentWebhookGuard,
    {
      provide: LOCAL_DEPOSIT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createLocalDepositProvider(
          {
            LOCAL_DEPOSIT_PROVIDER: config.get<string>(
              'LOCAL_DEPOSIT_PROVIDER',
            ),
            MPESA_CONSUMER_KEY: config.get<string>('MPESA_CONSUMER_KEY'),
            MPESA_CONSUMER_SECRET: config.get<string>('MPESA_CONSUMER_SECRET'),
          },
          new Logger('LocalDepositProviderFactory'),
        ),
    },
    {
      provide: FX_RATE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createFxRateProvider(
          { FX_RATE_PROVIDER: config.get<string>('FX_RATE_PROVIDER') },
          new Logger('FxRateProviderFactory'),
        ),
    },
  ],
  exports: [FxService],
})
export class FxModule {}
