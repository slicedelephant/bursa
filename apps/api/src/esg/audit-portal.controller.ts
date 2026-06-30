import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { EsgService } from './esg.service';

/**
 * E14 — Public, token-gated, READ-ONLY audit portal. An external auditor opens
 * `/audit-portal/:token` with the raw token from a time-limited grant and sees a
 * read-only audit-trail extract (ledger entries + ESG tags + chain integrity).
 * There is deliberately no write path here. A revoked grant → 403; malformed /
 * unknown / expired → 401.
 */
@Controller('audit-portal')
export class AuditPortalController {
  constructor(private readonly esg: EsgService) {}

  @Get(':token')
  async open(@Param('token') token: string) {
    const result = await this.esg.openAuditPortal(token);
    if (result.ok) {
      return result.data;
    }
    if (result.reason === 'revoked') {
      throw new ForbiddenException(
        'This auditor access grant has been revoked',
      );
    }
    throw new UnauthorizedException('Invalid or expired auditor access token');
  }
}
