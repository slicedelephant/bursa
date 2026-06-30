import { Module } from '@nestjs/common';
import { SchoolsModule } from '../schools/schools.module';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';

/**
 * E12 — Append-only ledger module. Exports `LedgerService` so other modules
 * (E12 reconciliation now; E14 CSRD audit-trail later) can append/read entries
 * without re-implementing the primitive. Imports SchoolsModule for the
 * school-admin scoping (`SchoolPortalService.resolveSchoolId`).
 */
@Module({
  imports: [SchoolsModule],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
