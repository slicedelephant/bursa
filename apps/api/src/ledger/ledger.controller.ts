import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { SchoolPortalService } from '../schools/school-portal.service';
import { LedgerService } from './ledger.service';

/**
 * E12 — Read-only ledger endpoint for a school admin. Scoped to the caller's own
 * school (E8 `resolveSchoolId`). The ledger is append-only; this controller only
 * reads (entries + chain integrity).
 */
@Controller('school')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SCHOOL_ADMIN)
export class LedgerController {
  constructor(
    private readonly ledger: LedgerService,
    private readonly portal: SchoolPortalService,
  ) {}

  @Get('ledger')
  async ledgerForMySchool(@CurrentUser('id') userId: string) {
    const schoolId = await this.portal.resolveSchoolId(userId);
    return this.ledger.viewForSchool(schoolId);
  }
}
