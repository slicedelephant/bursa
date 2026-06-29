import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AiCoachService } from './ai-coach.service';
import { GenerateShareDto } from './dto/generate-share.dto';
import { GenerateStoryDto } from './dto/generate-story.dto';
import { GenerateTitleDto } from './dto/generate-title.dto';

/**
 * AI Fundraising Coach (E10). STUDENT-only. Generates titles, story drafts and
 * social-share texts behind the swappable TextGenerationProvider (Mock by
 * default — no network, no key). Every endpoint is budget-guarded; the response
 * envelope is added globally. The ANTHROPIC_API_KEY never leaves the server.
 */
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class AiController {
  constructor(private readonly coach: AiCoachService) {}

  @Get('budget')
  budget(@CurrentUser('id') userId: string) {
    return this.coach.getBudget(userId);
  }

  @Post('title')
  title(@CurrentUser('id') userId: string, @Body() dto: GenerateTitleDto) {
    return this.coach.generateTitle(userId, dto);
  }

  @Post('story')
  story(@CurrentUser('id') userId: string, @Body() dto: GenerateStoryDto) {
    return this.coach.generateStory(userId, dto);
  }

  @Post('share')
  share(@CurrentUser('id') userId: string, @Body() dto: GenerateShareDto) {
    return this.coach.generateShare(userId, dto);
  }
}
