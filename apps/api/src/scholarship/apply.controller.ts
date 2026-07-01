/**
 * E19 — Scholarship Program Manager: public applicant surface. No login; every
 * route is gated by the hashed application token (E8/E11/E14 token pattern).
 */

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ScholarshipService } from './scholarship.service';

@Controller('apply')
export class ApplyController {
  constructor(private readonly scholarship: ScholarshipService) {}

  @Get(':token')
  form(@Param('token') token: string) {
    return this.scholarship.publicForm(token);
  }

  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: SubmitApplicationDto) {
    return this.scholarship.submitApplication(token, dto);
  }

  @Get(':token/status')
  status(@Param('token') token: string) {
    return this.scholarship.applicationStatus(token);
  }
}
