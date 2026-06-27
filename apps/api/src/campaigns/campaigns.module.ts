import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [CampaignsController, StatsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
