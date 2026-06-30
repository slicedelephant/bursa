import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LedgerModule } from '../ledger/ledger.module';
import { SchoolsModule } from '../schools/schools.module';
import { createBankFeedProvider } from './bank-feed.factory';
import { BANK_FEED_PROVIDER } from './bank-feed.provider.interface';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { TransparencyController } from './transparency.controller';

/**
 * E12 — Payout reconciliation + transparency module. The bank-feed sits behind a
 * swappable seam (Mock by default; Plaid env-gated) chosen by the pure factory,
 * exactly like PaymentsModule. Imports SchoolsModule (E8 scoping) and LedgerModule
 * (append-only ledger primitive, also reused by E14). Never touches the money path.
 */
@Module({
  imports: [SchoolsModule, LedgerModule],
  controllers: [ReconciliationController, TransparencyController],
  providers: [
    ReconciliationService,
    {
      provide: BANK_FEED_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createBankFeedProvider(
          {
            BANK_FEED_PROVIDER: config.get<string>('BANK_FEED_PROVIDER'),
            PLAID_SECRET: config.get<string>('PLAID_SECRET'),
            PLAID_CLIENT_ID: config.get<string>('PLAID_CLIENT_ID'),
          },
          new Logger('BankFeedProviderFactory'),
        ),
    },
  ],
})
export class ReconciliationModule {}
