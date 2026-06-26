import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { StatsController } from './stats.controller';

@Module({
  controllers: [CampaignsController, StatsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
