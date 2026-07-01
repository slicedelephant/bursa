import { Module } from '@nestjs/common';
import { CorporateModule } from '../corporate/corporate.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

/**
 * E18 Groups-Engine — one engine, two modes (cohort teams + giving circles).
 * Imports the E5 CorporateModule so the cohort match runs through the existing
 * CorporateService.sponsor flow (no new payment path). Reuses the E16
 * gamification primitives, E15/E8 invite token and E9 moderation via plain
 * imports of their pure utils (no extra module wiring needed).
 */
@Module({
  imports: [CorporateModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
