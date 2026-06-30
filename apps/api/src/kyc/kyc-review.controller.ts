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
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ReviewDecideDto } from './dto/review-decide.dto';
import { KycReviewService } from './kyc-review.service';

/**
 * KYC manual-review operator console (E11). ADMIN-only. Lists the review queue
 * (exception cases), shows a single case, decides APPROVE/REJECT and reads the
 * aggregate dashboard. Every decision is audited via the reused E6 AuditService.
 */
@Controller('kyc/review')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class KycReviewController {
  constructor(private readonly review: KycReviewService) {}

  @Get('queue')
  queue(@Query('status') status?: string) {
    return this.review.listQueue(status);
  }

  @Get('dashboard')
  dashboard() {
    return this.review.dashboard();
  }

  @Get(':id')
  getCase(@Param('id') id: string) {
    return this.review.getCase(id);
  }

  @Post(':id/decide')
  decide(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewDecideDto,
  ) {
    return this.review.decide(id, reviewerId, dto.decision, dto.note);
  }
}
