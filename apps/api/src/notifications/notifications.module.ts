import { Module } from '@nestjs/common';
import { EmailLogger } from './email-logger';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailLogger],
  exports: [NotificationsService],
})
export class NotificationsModule {}
