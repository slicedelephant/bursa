import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DonorsController } from './donors.controller';
import { DonorsService } from './donors.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DonorsController],
  providers: [DonorsService],
})
export class DonorsModule {}
