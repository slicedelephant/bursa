import { Controller, Get, Param } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';

/**
 * E12 — Public transparency endpoint. No auth: a school website can embed the
 * aggregate funding statistics. PII-free — only aggregates are returned (no
 * individual donors, names or IDs). Uses the standard {success,data} envelope.
 */
@Controller('transparency')
export class TransparencyController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  @Get('schools/:schoolId')
  schoolStats(@Param('schoolId') schoolId: string) {
    return this.reconciliation.transparency(schoolId);
  }
}
