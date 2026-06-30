import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AmlScreenDto } from './dto/aml-screen.dto';
import { KycService } from './kyc.service';

/**
 * Corporate sponsor AML screening (E11). SPONSOR-only. Screens a contribution
 * above the AML threshold behind the swappable AML provider (Mock by default).
 * A sanctioned country is a hard block (422 AML_BLOCKED); a hit routes the case
 * to manual review. Every decision is audited via the reused E6 AuditService.
 */
@Controller('kyc/aml')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SPONSOR)
export class KycAmlController {
  constructor(private readonly kyc: KycService) {}

  @Post('screen')
  screen(@CurrentUser('id') userId: string, @Body() dto: AmlScreenDto) {
    return this.kyc.screenSponsor(userId, dto.amountCents, dto.country);
  }
}
