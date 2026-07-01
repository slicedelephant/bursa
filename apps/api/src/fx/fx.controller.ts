import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { FxService } from './fx.service';
import {
  CreatePayoutDto,
  CreateSchoolAccountDto,
  InitiateDepositDto,
} from './dto/fx.dto';

/**
 * E20 — Multi-Currency & local payment methods. Read-only currency/rate/method/label
 * routes are public (they drive the donate flow). Deposit is public/donor. School-account
 * management is SCHOOL_ADMIN/ADMIN; the school payout is ADMIN. Every payout targets the
 * SCHOOL, never a student. Responses use the global `{success,data,error}` envelope.
 */
@Controller('fx')
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get('currencies')
  currencies() {
    return this.fx.listCurrencies();
  }

  @Get('quote')
  quote(@Query('base') base: string, @Query('quote') quote: string) {
    return this.fx.quote(base, quote);
  }

  @Get('methods')
  methods(@Query('country') country: string) {
    return this.fx.methodsForCountry(country ?? '');
  }

  @Get('labels')
  labels(@Query('locale') locale: string) {
    return this.fx.labelsForLocale(locale ?? 'en');
  }

  @Post('deposits')
  initiateDeposit(@Body() dto: InitiateDepositDto) {
    return this.fx.initiateDeposit(dto);
  }

  @Post('school-accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.ADMIN)
  createSchoolAccount(@Body() dto: CreateSchoolAccountDto) {
    return this.fx.createSchoolAccount(dto);
  }

  @Get('school-accounts/:schoolId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.ADMIN)
  listSchoolAccounts(@Param('schoolId') schoolId: string) {
    return this.fx.listSchoolAccounts(schoolId);
  }

  @Post('payouts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  payout(@Body() dto: CreatePayoutDto) {
    return this.fx.payoutToSchool(dto);
  }
}
