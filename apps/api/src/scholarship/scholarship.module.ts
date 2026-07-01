/**
 * E19 — Self-Serve Corporate Scholarship Program Manager.
 *
 * Reuses existing infra, does not rebuild it:
 * - LedgerModule (E12) — append-only DISBURSEMENT entries for every award payout.
 * - PaymentsModule (E2, @Global) — `PaymentProvider.createPayout` to the SCHOOL.
 * - E17 messaging seam — the same `MESSAGING_PROVIDER` Symbol + env-gated factory
 *   (Mock by default) for scholar SMS/email. Bound here so the module is
 *   self-contained without importing the whole ImpactFeedModule.
 * - E5 corporate PDF/CSV + E14 diversity aggregator are pure imports (no module).
 * Money always flows to the school, never to the scholar (Constitution II).
 */

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LedgerModule } from '../ledger/ledger.module';
import {
  createMessagingProvider,
  MessagingEnv,
} from '../impact-feed/messaging/messaging-provider.factory';
import { MESSAGING_PROVIDER } from '../impact-feed/messaging/messaging-provider.interface';
import { ApplyController } from './apply.controller';
import { ScholarshipController } from './scholarship.controller';
import { ScholarshipService } from './scholarship.service';

@Module({
  imports: [LedgerModule],
  controllers: [ScholarshipController, ApplyController],
  providers: [
    ScholarshipService,
    {
      provide: MESSAGING_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env: MessagingEnv = {
          MESSAGING_PROVIDER: config.get<string>('MESSAGING_PROVIDER'),
          WHATSAPP_TOKEN: config.get<string>('WHATSAPP_TOKEN'),
          WHATSAPP_PHONE_ID: config.get<string>('WHATSAPP_PHONE_ID'),
          WHATSAPP_API_VERSION: config.get<string>('WHATSAPP_API_VERSION'),
          TELEGRAM_BOT_TOKEN: config.get<string>('TELEGRAM_BOT_TOKEN'),
        };
        return createMessagingProvider(env);
      },
    },
  ],
  exports: [ScholarshipService],
})
export class ScholarshipModule {}
