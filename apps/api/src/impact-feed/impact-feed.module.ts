import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FeedController,
  StudentVoiceController,
} from './impact-feed.controller';
import { ImpactFeedService } from './impact-feed.service';
import {
  MessagingEnv,
  createMessagingProvider,
} from './messaging/messaging-provider.factory';
import { MESSAGING_PROVIDER } from './messaging/messaging-provider.interface';

/**
 * E17 Multi-Channel Impact-Feed. The messaging provider is bound via the pure
 * env-gated factory: default is the network-free MockMessagingProvider, so the
 * app boots without any keys (MESSAGING_PROVIDER=mock). This module reuses the
 * E4 Prisma data read-only and never rebuilds the E4 email thank-you path.
 */
@Module({
  controllers: [FeedController, StudentVoiceController],
  providers: [
    ImpactFeedService,
    {
      provide: MESSAGING_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env: MessagingEnv = {
          MESSAGING_PROVIDER: config.get<string>('MESSAGING_PROVIDER'),
          WHATSAPP_TOKEN: config.get<string>('WHATSAPP_TOKEN'),
          WHATSAPP_PHONE_ID: config.get<string>('WHATSAPP_PHONE_ID'),
          WHATSAPP_API_VERSION: config.get<string>('WHATSAPP_API_VERSION'),
          TELEGRAM_BOT_TOKEN: config.get<string>('TELEGRAM_BOT_TOKEN'),
        };
        return createMessagingProvider(env);
      },
    },
  ],
  exports: [ImpactFeedService],
})
export class ImpactFeedModule {}
