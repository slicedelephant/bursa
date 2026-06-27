import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AccountService } from './account.service';
import { clientIp } from './rate-limit.guard';

/**
 * GDPR self-service endpoints for the authenticated user: export own data and
 * delete (anonymise) the account. The money/audit trail is preserved; only PII
 * is scrubbed.
 */
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('export')
  exportData(@CurrentUser('id') userId: string, @Req() req: Request) {
    return this.account.exportData(userId, clientIp(req));
  }

  @Post('delete')
  deleteAccount(@CurrentUser('id') userId: string, @Req() req: Request) {
    return this.account.anonymize(userId, clientIp(req));
  }
}
