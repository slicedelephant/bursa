import { Module } from '@nestjs/common';
import { DonationsModule } from '../donations/donations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CorporateController } from './corporate.controller';
import { CorporateService } from './corporate.service';

@Module({
  imports: [DonationsModule, NotificationsModule],
  controllers: [CorporateController],
  providers: [CorporateService],
  exports: [CorporateService],
})
export class CorporateModule {}
