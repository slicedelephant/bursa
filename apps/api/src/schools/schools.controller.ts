import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateSchoolDto } from './dto/create-school.dto';
import { VerifyPayoutDto } from './dto/verify-payout.dto';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Get()
  list() {
    return this.schools.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSchoolDto) {
    return this.schools.create(dto);
  }

  @Patch(':id/verify-payout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  verifyPayout(@Param('id') id: string, @Body() dto: VerifyPayoutDto) {
    return this.schools.verifyPayout(id, dto);
  }
}
