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
import { PayrollService } from './payroll.service';
import {
  ActivateEmployeeDto,
  ConfigureRuleDto,
  ConnectHrisDto,
  RunCampaignDto,
  SyncHrisDto,
} from './dto/payroll.dto';

/**
 * E21 — Payroll-Match & HRIS-Kopplung. HRIS connect/sync/rule/campaign/trail are
 * SPONSOR/ADMIN; the employee opt-in is any authenticated user. The signed HRIS
 * webhook lives in its own controller (rawBody + signature guard). Every matched
 * payroll gift targets the SCHOOL, never an employee/student. Responses use the
 * global `{success,data,error}` envelope.
 */
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR, Role.ADMIN)
  connect(@Body() dto: ConnectHrisDto) {
    return this.payroll.connectHris(dto);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR, Role.ADMIN)
  sync(@Body() dto: SyncHrisDto) {
    return this.payroll.syncEmployees(dto);
  }

  @Post('rule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR, Role.ADMIN)
  rule(@Body() dto: ConfigureRuleDto) {
    return this.payroll.configureRule(dto);
  }

  @Get('employees/:connectionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR, Role.ADMIN)
  employees(@Param('connectionId') connectionId: string) {
    return this.payroll.listEmployees(connectionId);
  }

  @Post('activate')
  @UseGuards(JwtAuthGuard)
  activate(@Body() dto: ActivateEmployeeDto) {
    return this.payroll.activateEmployee(dto);
  }

  @Post('campaign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR, Role.ADMIN)
  campaign(@Body() dto: RunCampaignDto) {
    return this.payroll.runCampaign(dto);
  }

  @Get('trail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SPONSOR, Role.ADMIN)
  trail(@Query('corporateProfileId') _corporateProfileId?: string) {
    return this.payroll.complianceTrail();
  }
}
