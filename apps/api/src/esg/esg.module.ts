import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { ObservabilityModule } from '../observability/observability.module';
import { SecurityModule } from '../security/security.module';
import { AuditPortalController } from './audit-portal.controller';
import { EsgAdminController } from './esg-admin.controller';
import { EsgService } from './esg.service';

/**
 * E14 — ESG/CSR audit-trail & CSRD-compliance-reporting module. A READ/AGGREGATE
 * layer over the E12 append-only ledger: it reuses `LedgerService` (read-only),
 * the E6 `AuditService` (logs report/grant actions) and the E7 `AnalyticsService`
 * (ESG/report events). No new ledger, no money path — reporting only.
 */
@Module({
  imports: [LedgerModule, SecurityModule, ObservabilityModule],
  controllers: [EsgAdminController, AuditPortalController],
  providers: [EsgService],
})
export class EsgModule {}
