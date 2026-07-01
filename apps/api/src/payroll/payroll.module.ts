/**
 * E21 — Payroll-Match & HRIS-Kopplung module.
 *
 * Reuses existing infra, does not rebuild it:
 * - E13 matching (`match-amount.ts` via `match-rule.ts`) — the match calculation.
 * - E5 corporate (`CorporateProfile`) — the payroll program's owner.
 * - E6 security (`SecurityModule` → `AuditService`) — the sync/compliance trail;
 *   the HRIS webhook reuses the E6 signature scheme.
 * - E2 payments (`PaymentsModule`, @Global) + E12 ledger (`LedgerModule`) — the
 *   matched gift flows to the SCHOOL and is recorded in the append-only ledger.
 * Binds the HRIS `EmployeeDataProvider` seam (Mock by default) via an env-gated
 * factory, exactly like the E2 payment-provider factory. Money always to the school.
 */

import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LedgerModule } from '../ledger/ledger.module';
import { SecurityModule } from '../security/security.module';
import { createEmployeeDataProvider } from './employee-data.provider.factory';
import { EMPLOYEE_DATA_PROVIDER } from './employee-data.provider.interface';
import { HrisWebhookController } from './hris-webhook.controller';
import { HrisWebhookGuard } from './hris-webhook.guard';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [LedgerModule, SecurityModule],
  controllers: [PayrollController, HrisWebhookController],
  providers: [
    PayrollService,
    HrisWebhookGuard,
    {
      provide: EMPLOYEE_DATA_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createEmployeeDataProvider(
          {
            HRIS_PROVIDER: config.get<string>('HRIS_PROVIDER'),
            ADP_CLIENT_ID: config.get<string>('ADP_CLIENT_ID'),
            ADP_CLIENT_SECRET: config.get<string>('ADP_CLIENT_SECRET'),
            WORKDAY_CLIENT_ID: config.get<string>('WORKDAY_CLIENT_ID'),
            WORKDAY_CLIENT_SECRET: config.get<string>('WORKDAY_CLIENT_SECRET'),
          },
          new Logger('EmployeeDataProviderFactory'),
        ),
    },
  ],
  exports: [PayrollService],
})
export class PayrollModule {}
